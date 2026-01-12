/**
 * Sync Permissions Script (CLEAN SYNC)
 *
 * ALWAYS clears ALL permissions and re-inserts fresh from routeRegistry.tsx
 * Ensures DB always matches route registry exactly.
 *
 * Run with: pnpm sync:permissions
 */

import db from '../index.js';
import { permissions, rolePermissions, roles } from '../schema/index.js';
import { eq, inArray, sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REGISTRY_PATH = path.resolve(__dirname, '../../../../client/src/config/routeRegistry.tsx');

/**
 * Parse routeRegistry.tsx and extract route definitions with API dependencies
 */
function extractPermissionsFromRegistry(content) {
  const moduleMap = new Map();
  const lines = content.split('\n');

  let currentRoute = {};
  let depth = 0;
  let inRouteRegistry = false;
  let inApis = false;
  let currentApiBlock = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.includes('export const routeRegistry')) {
      inRouteRegistry = true;
      continue;
    }

    if (!inRouteRegistry) continue;

    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;

    if (trimmed.includes('apis: [')) {
      inApis = true;
      currentApiBlock = '';
      if (!currentRoute.apis) currentRoute.apis = [];
    }

    if (inApis) {
      currentApiBlock += trimmed;

      // Parse API entries
      const apiMatches = [
        ...currentApiBlock.matchAll(
          /\{\s*route:\s*['"]([^'"]+)['"]\s*,\s*method:\s*['"]([^'"]+)['"]\s*,\s*label:\s*['"]([^'"]+)['"]/g
        ),
      ];

      for (const match of apiMatches) {
        const route = match[1];
        const method = match[2];
        const label = match[3];
        const apiKey = `${method}:${route}`;

        if (!currentRoute.apis.find(a => a.key === apiKey)) {
          currentRoute.apis.push({ key: apiKey, label });
        }
      }

      if (trimmed.includes('],') || (trimmed.includes(']') && !trimmed.includes('['))) {
        inApis = false;
        currentApiBlock = '';
      }
      continue;
    }

    if (trimmed === '{' || trimmed.startsWith('{ ')) {
      depth++;
      currentRoute = {};
    }

    const idMatch = trimmed.match(/^id:\s*['"]([^'"]+)['"]/);
    if (idMatch) currentRoute.id = idMatch[1];

    const pathMatch = trimmed.match(/^path:\s*['"]([^'"]+)['"]/);
    if (pathMatch) currentRoute.path = pathMatch[1];

    const labelMatch = trimmed.match(/^label:\s*['"]([^'"]+)['"]/);
    if (labelMatch) currentRoute.label = labelMatch[1];

    const groupMatch = trimmed.match(/^group:\s*['"]([^'"]+)['"]/);
    if (groupMatch) currentRoute.group = groupMatch[1];

    if (trimmed.includes('showInSidebar: false')) {
      currentRoute.hidden = true;
    }

    const permMatch = trimmed.match(/permission:\s*\{\s*module:\s*['"]([^'"]+)['"]/);
    if (permMatch) {
      currentRoute.module = permMatch[1];
    }

    if (closeBraces > openBraces || trimmed === '},') {
      depth -= closeBraces - openBraces;

      if (currentRoute.module && currentRoute.path && currentRoute.label) {
        const moduleName = currentRoute.module;

        let parentModule = null;
        if (currentRoute.path.includes('/reports/') && moduleName !== 'reports') {
          parentModule = 'reports';
        }

        const entry = {
          name: moduleName,
          path: currentRoute.path,
          label: currentRoute.label,
          group: currentRoute.group || inferGroup(currentRoute.path),
          parent: parentModule,
          hidden: !!currentRoute.hidden,
          id: currentRoute.id,
          availableApis:
            currentRoute.apis && currentRoute.apis.length > 0
              ? currentRoute.apis.map(a => a.key)
              : [],
        };

        if (!moduleMap.has(moduleName)) {
          moduleMap.set(moduleName, []);
        }
        moduleMap.get(moduleName).push(entry);

        currentRoute = {};
      }
    }

    if (depth < 0) break;
  }

  const pages = [];
  for (const [name, occurrences] of moduleMap.entries()) {
    // Filter out hidden routes - only use visible ones
    const visibleOccurrences = occurrences.filter(o => !o.hidden);

    // If no visible routes exist for this module, skip it entirely
    if (visibleOccurrences.length === 0) {
      console.log(`  ⏭️  Skipping hidden module: ${name}`);
      continue;
    }

    // Pick the best visible route (shortest path)
    const best = visibleOccurrences.sort((a, b) => a.path.length - b.path.length)[0];
    pages.push(best);
  }

  return pages;
}

function inferGroup(pathStr) {
  if (pathStr.startsWith('/dashboard')) return 'Main';
  if (pathStr.startsWith('/sales') || pathStr.includes('crm')) return 'Sales';
  if (pathStr.startsWith('/inventory')) return 'Inventory';
  if (pathStr.startsWith('/operations')) return 'Operations';
  if (pathStr.startsWith('/masters')) return 'Masters';
  if (pathStr.startsWith('/reports')) return 'Reports';
  if (pathStr.startsWith('/settings')) return 'Settings';
  return 'Other';
}

async function syncPermissions() {
  console.log('🔄 CLEAN SYNC: Parsing routeRegistry.tsx...\n');

  try {
    if (!fs.existsSync(REGISTRY_PATH)) {
      throw new Error(`Registry file not found at: ${REGISTRY_PATH}`);
    }
    const registryContent = fs.readFileSync(REGISTRY_PATH, 'utf-8');

    const pagePermissions = extractPermissionsFromRegistry(registryContent);

    // Add manual settings pages
    const hasRoles = pagePermissions.find(p => p.name === 'roles');
    if (!hasRoles) {
      pagePermissions.push({
        name: 'roles',
        label: 'Roles',
        path: '/settings/roles',
        group: 'Settings',
        availableApis: ['GET:/roles', 'POST:/roles', 'PUT:/roles/:id', 'DELETE:/roles/:id'],
      });
    }

    console.log(`📝 Found ${pagePermissions.length} permissions in route registry:`);
    pagePermissions.forEach(p => {
      const apiCount = p.availableApis?.length || 0;
      console.log(`   - ${p.label} (${p.name}) [${apiCount} APIs]`);
    });

    // ============================================
    // STEP 1: Clear ALL existing permissions
    // ============================================
    console.log('\n🗑️  Clearing ALL existing permissions...');

    // Delete role_permissions first (foreign key constraint)
    await db.delete(rolePermissions);
    console.log('   ✓ Cleared role_permissions table');

    // Delete all permissions
    await db.delete(permissions);
    console.log('   ✓ Cleared permissions table');

    // ============================================
    // STEP 2: Insert fresh permissions
    // ============================================
    console.log('\n🚀 Inserting fresh permissions...');
    const parentIdMap = {};

    for (const page of pagePermissions) {
      const [created] = await db
        .insert(permissions)
        .values({
          permissionName: page.name,
          description: `Access to ${page.label}`,
          pagePath: page.path,
          pageLabel: page.label,
          pageGroup: page.group,
          isPage: true,
          availableActions: page.availableApis || [],
        })
        .returning();
      parentIdMap[page.name] = created.permissionId;
    }
    console.log(`   ✓ Inserted ${pagePermissions.length} permissions`);

    // Link parents
    console.log('🔗 Linking parent pages...');
    for (const page of pagePermissions) {
      if (page.parent && parentIdMap[page.parent]) {
        await db
          .update(permissions)
          .set({ parentId: parentIdMap[page.parent] })
          .where(eq(permissions.permissionName, page.name));
      }
    }

    // ============================================
    // STEP 3: Grant ALL to SuperAdmin
    // ============================================
    console.log('\n👑 Granting all permissions to SuperAdmin...');

    const [superAdmin] = await db
      .select()
      .from(roles)
      .where(eq(roles.roleName, 'SuperAdmin'))
      .limit(1);

    if (superAdmin) {
      const allPerms = await db
        .select({ id: permissions.permissionId, apis: permissions.availableActions })
        .from(permissions);

      const rolePermValues = allPerms.map(perm => ({
        roleId: superAdmin.roleId,
        permissionId: perm.id,
        grantedActions: Array.isArray(perm.apis) ? perm.apis : [],
      }));

      await db.insert(rolePermissions).values(rolePermValues);
      console.log(`   ✓ Granted ${rolePermValues.length} permissions to SuperAdmin`);
    } else {
      console.warn('   ⚠️ SuperAdmin role not found!');
    }

    // Also grant to Admin if exists
    const [admin] = await db.select().from(roles).where(eq(roles.roleName, 'Admin')).limit(1);

    if (admin) {
      const allPerms = await db
        .select({ id: permissions.permissionId, apis: permissions.availableActions })
        .from(permissions);

      const rolePermValues = allPerms.map(perm => ({
        roleId: admin.roleId,
        permissionId: perm.id,
        grantedActions: Array.isArray(perm.apis) ? perm.apis : [],
      }));

      await db.insert(rolePermissions).values(rolePermValues);
      console.log(`   ✓ Granted ${rolePermValues.length} permissions to Admin`);
    }

    // ============================================
    // STEP 4: Grant to Sales Team
    // ============================================
    console.log('\n💼 Granting permissions to Sales Team...');

    const salesRoles = await db
      .select()
      .from(roles)
      .where(sql`${roles.roleName} ILIKE 'Sales%'`);

    if (salesRoles.length > 0) {
      // Define modules that Sales should access
      // 'orders' contains the 'Get Mixing Ratios' API
      const salesModules = [
        'orders',
        'quotations',
        'crm',
        'sales-dashboard',
        'Add New Customer',
        'customers',
        'quotation-maker',
      ];

      const salesPerms = await db
        .select({
          id: permissions.permissionId,
          name: permissions.permissionName,
          apis: permissions.availableActions,
        })
        .from(permissions)
        .where(inArray(permissions.permissionName, salesModules));

      for (const role of salesRoles) {
        const rolePermValues = salesPerms.map(perm => ({
          roleId: role.roleId,
          permissionId: perm.id,
          grantedActions: Array.isArray(perm.apis) ? perm.apis : [],
        }));

        if (rolePermValues.length > 0) {
          await db.insert(rolePermissions).values(rolePermValues);
          console.log(`   ✓ Granted ${rolePermValues.length} permissions to ${role.roleName}`);
        }
      }
    } else {
      console.log('   ⚠️ No Sales roles found (Sales Manager/Executive)');
    }

    console.log(
      `\n✅ CLEAN SYNC complete! ${pagePermissions.length} permissions match route registry.`
    );
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

syncPermissions()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
