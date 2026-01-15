
import { eq, and, like } from 'drizzle-orm';
import db from '../src/db/index.js';
import { roles, permissions, rolePermissions } from '../src/db/schema/index.js';

async function main() {
    console.log('Starting permission grant script for Dealer...');

    try {
        // 1. Find Dealer Role
        const [dealerRole] = await db.select().from(roles).where(eq(roles.roleName, 'Dealer'));
        if (!dealerRole) {
            console.error('❌ Error: Dealer role not found!');
            process.exit(1);
        }
        console.log(`✅ Found Dealer Role: ID ${dealerRole.roleId}`);

        // 2. Find "orders" Permission (Module)
        // In route-permissions.json, ID="create-order" has permission: { module: "orders" }
        // The DB likely stores "orders" or "create-order" as permissionName.
        // Let's search for it.
        const allPermissions = await db.select().from(permissions);

        // Look for permission with name 'orders' (common convention from seeds)
        // OR 'create-order'
        let ordersPerm = allPermissions.find(p => p.permissionName === 'orders');

        if (!ordersPerm) {
            console.log('Permission "orders" not found by exact match. Searching loosely...');
            ordersPerm = allPermissions.find(p => p.permissionName.includes('order') || p.permissionName.includes('Order'));
        }

        if (!ordersPerm) {
            console.error('❌ Error: Could not find a permission module related to "orders". Available:', allPermissions.map(p => p.permissionName));
            process.exit(1);
        }

        console.log(`✅ Found Orders Permission: ID ${ordersPerm.permissionId} ("${ordersPerm.permissionName}")`);

        // 3. Define Actions to Grant
        // These match the APIs listed in route-permissions.json for "create-order"
        const actionsToGrant = [
            'GET:/masters/customers/active-list',
            'GET:/employees',
            'GET:/inventory/products',
            'GET:/tnc',
            'GET:/quotations',
            'POST:/quotations',
            'PUT:/quotations/:id',
            'POST:/quotations/:id/convert',
            'GET:/orders',
            'POST:/orders',
            'GET:/product-development/ratios/:baseMpId/:hardenerMpId', // Mixing ratios
            'GET:/quotations/:id' // View details
        ];

        // 4. Update/Insert RolePermission
        const existingEntry = await db.select()
            .from(rolePermissions)
            .where(and(
                eq(rolePermissions.roleId, dealerRole.roleId),
                eq(rolePermissions.permissionId, ordersPerm.permissionId)
            ));

        if (existingEntry.length > 0) {
            console.log('🔄 Updating existing permission entry...');
            // Merge with existing actions to avoid removing other unrelated grants if any (though usually strictly defined)
            // For now, we overwrite to ensure ours are present.
            // Or better: union.
            const existingActions = existingEntry[0].grantedActions || [];
            const mergedActions = [...new Set([...existingActions, ...actionsToGrant])];

            await db.update(rolePermissions)
                .set({ grantedActions: mergedActions })
                .where(and(
                    eq(rolePermissions.roleId, dealerRole.roleId),
                    eq(rolePermissions.permissionId, ordersPerm.permissionId)
                ));
            console.log('✅ Permissions updated.');
        } else {
            console.log('➕ Creating new permission entry...');
            await db.insert(rolePermissions).values({
                roleId: dealerRole.roleId,
                permissionId: ordersPerm.permissionId,
                grantedActions: actionsToGrant
            });
            console.log('✅ Permissions inserted.');
        }

        console.log('🎉 Successfully granted Orders/Quotations permissions to Dealer.');

    } catch (err) {
        console.error('❌ Script failed:', err);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

main();
