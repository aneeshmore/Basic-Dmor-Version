import db from '../index.js';
import { departments, roles } from '../schema/index.js';
import { eq, sql } from 'drizzle-orm';

async function ensureDepartmentsAndRoles() {
  console.log('🔄 Checking and seeding Departments and Roles...');

  try {
    // --- 1. Ensure Departments ---
    const departmentsToEnsure = [
      'Dealer',
      'Accounts',
      'Administration',
      'Production',
      'Sales & Marketing',
      'Administrator', // Added based on user request "same for Administrator"
    ];

    for (const deptName of departmentsToEnsure) {
      const [existing] = await db
        .select()
        .from(departments)
        .where(sql`LOWER(${departments.departmentName}) = LOWER(${deptName})`);

      if (!existing) {
        console.log(`➕ Creating Department: ${deptName}`);
        await db.insert(departments).values({
          departmentName: deptName,
          isActive: true,
          isSystemDepartment: true,
        });
      } else if (!existing.isSystemDepartment) {
        console.log(`🔧 Setting ${deptName} as system department`);
        await db
          .update(departments)
          .set({ isSystemDepartment: true })
          .where(eq(departments.departmentId, existing.departmentId));
      } else {
        console.log(`✅ Department exists: ${deptName} (system)`);
      }
    }

    // --- 2. Ensure Roles ---

    // Check Dealer Role
    const [dealerRole] = await db.select().from(roles).where(eq(roles.roleName, 'Dealer'));

    if (!dealerRole) {
      console.log('➕ Creating Role: Dealer');
      // Need department ID for Dealer
      const [dealerDept] = await db
        .select()
        .from(departments)
        .where(eq(departments.departmentName, 'Dealer'));

      await db.insert(roles).values({
        roleName: 'Dealer',
        description: 'Read-only access for dealers',
        isActive: true,
        isSalesRole: true,
        departmentId: dealerDept?.departmentId || null,
      });
    } else {
      console.log('✅ Role exists: Dealer');
      // Ensure isSalesRole is true (from previous context)
      if (!dealerRole.isSalesRole) {
        console.log('🛠️  Updating Dealer role: Setting isSalesRole = true');
        await db
          .update(roles)
          .set({ isSalesRole: true })
          .where(eq(roles.roleId, dealerRole.roleId));
      }
    }

    console.log('✨ Departments and Roles check completed.');
  } catch (err) {
    console.error('❌ Error in ensureDepartmentsAndRoles:', err);
  } finally {
    process.exit(0);
  }
}

ensureDepartmentsAndRoles();
