import db from '../index.js';
import {
  employees,
  roles,
  permissions,
  rolePermissions,
  employeeRoles,
  departments,
} from '../schema/index.js';
import { hashValue } from '../../utils/encryption.js';
import { eq } from 'drizzle-orm';
import { fileURLToPath } from 'url';

console.log('create-admin.js starting', {
  argv: process.argv.slice(1),
  cwd: process.cwd(),
  env: process.env.NODE_ENV,
});

// SEED DATA from seed-org-structure.js
const SEED_DATA = [
  {
    department: 'Administrator',
    roles: ['SuperAdmin', 'Admin']
  },
  {
    department: 'Accounts',
    roles: ['Accounts Manager']
  },
  {
    department: 'Production',
    roles: ['Production Manager']
  },
  {
    department: 'Dealer',
    roles: ['Dealer']
  },
  {
    department: 'Sales & Marketing',
    roles: ['Sales Person']
  }
];

async function seedOrgStructure() {
  console.log('Starting Organization Structure Seed...');

  // PRE-SEED: Rename 'Viewer' to 'Dealer' if exists and 'Dealer' does not
  // This ensures we migrate the role instead of creating a duplicate
  const [viewerRole] = await db.select().from(roles).where(eq(roles.roleName, 'Viewer'));
  const [dealerRole] = await db.select().from(roles).where(eq(roles.roleName, 'Dealer'));

  if (viewerRole && !dealerRole) {
    console.log('🔄 Renaming "Viewer" role to "Dealer"...');
    await db
      .update(roles)
      .set({ roleName: 'Dealer', description: 'Read-only access (Dealer)' })
      .where(eq(roles.roleId, viewerRole.roleId));
  }

  for (const group of SEED_DATA) {
    // 1. Ensure Department Exists
    let [dept] = await db
      .select()
      .from(departments)
      .where(eq(departments.departmentName, group.department));

    if (!dept) {
      console.log(`Creating department: ${group.department}`);
      const [newDept] = await db
        .insert(departments)
        .values({
          departmentName: group.department,
          isActive: true
        })
        .returning();
      dept = newDept;
    } else {
      console.log(`Department exists: ${group.department}`);
    }

    // 2. Ensure Roles Exist and are linked to Department
    for (const roleName of group.roles) {
      let [role] = await db
        .select()
        .from(roles)
        .where(eq(roles.roleName, roleName));

      if (!role) {
        console.log(`Creating role: ${roleName} in ${group.department}`);
        const roleData = {
          roleName: roleName,
          description: `${roleName} role for ${group.department}`,
          isActive: true,
          departmentId: dept.departmentId,
          landingPage: '/dashboard'
        };

        // Specific configurations
        if (roleName === 'SuperAdmin') {
          roleData.description = 'Super administrator with all permissions';
          roleData.landingPage = '/dashboard/admin';
        }

        if (roleName.includes('Sales') || roleName === 'Dealer') {
          roleData.isSalesRole = true;
        }

        await db
          .insert(roles)
          .values(roleData);
      } else {
        console.log(`Role exists: ${roleName}`);
        // Ensure department link is correct
        if (role.departmentId !== dept.departmentId) {
          console.log(`Updating role ${roleName} department to ${group.department}`);
          await db
            .update(roles)
            .set({ departmentId: dept.departmentId })
            .where(eq(roles.roleId, role.roleId));
        }
        // Ensure SuperAdmin landing page
        if (roleName === 'SuperAdmin' && role.landingPage !== '/dashboard/admin') {
          await db.update(roles).set({ landingPage: '/dashboard/admin' }).where(eq(roles.roleId, role.roleId));
        }
      }
    }
  }
  console.log('Organization Structure Seed Completed Successfully.');
}

async function createAdmin() {
  try {
    // RUN ORG STRUCTURE SEED FIRST
    await seedOrgStructure();

    console.log('Checking for existing admin user...');
    const [existing] = await db.select().from(employees).where(eq(employees.username, 'admin'));
    console.log('Existing admin user:', existing);
    const hashed = await hashValue('admin123');
    console.log('Hashed password:', hashed);
    let employeeRecord = existing;
    if (existing) {
      // Update password and status if user exists
      console.log('Admin exists, updating password and status...');
      const [updated] = await db
        .update(employees)
        .set({
          passwordHash: hashed,
          status: 'Active',
        })
        .where(eq(employees.username, 'admin'))
        .returning();
      console.log('Admin user already existed. Password reset and status set to Active:', updated);
      employeeRecord = updated;
    } else {
      console.log('No admin found, inserting new admin...');
      const [inserted] = await db
        .insert(employees)
        .values({
          firstName: 'Super',
          lastName: 'Admin',
          username: 'admin',
          passwordHash: hashed,
          mobileNo: ['9999999999', null, null],
          emailId: 'admin@morex.com',
          status: 'Active',
        })
        .returning();
      console.log('Inserted admin user:', inserted);
      employeeRecord = inserted;
    }

    // Fetch necessary Admin Dept and Role objects (guaranteed to exist now)
    const [adminDept] = await db.select().from(departments).where(eq(departments.departmentName, 'Administrator'));
    const [superRole] = await db.select().from(roles).where(eq(roles.roleName, 'SuperAdmin'));

    // Assign role to the user if not already assigned
    console.log('Assigning role to admin if missing...');
    const existingRoleAssign = await db
      .select()
      .from(employeeRoles)
      .where(eq(employeeRoles.employeeId, employeeRecord.employeeId));
    const hasRole =
      existingRoleAssign && existingRoleAssign.some(r => r.roleId === superRole.roleId);
    if (!hasRole) {
      const [er] = await db
        .insert(employeeRoles)
        .values({ employeeId: employeeRecord.employeeId, roleId: superRole.roleId })
        .returning();
      console.log('Assigned SuperAdmin role to admin:', er);
    } else {
      console.log('Admin already has SuperAdmin role');
    }

    // Ensure the employee is in the Administrator department
    if (employeeRecord.departmentId !== adminDept.departmentId) {
      console.log('Updating admin user department to Administrator...');
      const [updatedEmployee] = await db
        .update(employees)
        .set({ departmentId: adminDept.departmentId })
        .where(eq(employees.employeeId, employeeRecord.employeeId))
        .returning();
      console.log('Updated admin employee department:', updatedEmployee);
      employeeRecord = updatedEmployee;
    } else {
      console.log('Admin is already assigned to Administrator department');
    }

    // Grant all permissions to the SuperAdmin role
    console.log('Granting all permissions to SuperAdmin role...');
    const allPerms = await db.select().from(permissions);
    for (const perm of allPerms) {
      const existingRP = await db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, superRole.roleId))
        .then(rows => rows.find(rp => rp.permissionId === perm.permissionId));
      if (!existingRP) {
        const [rpInserted] = await db
          .insert(rolePermissions)
          .values({
            roleId: superRole.roleId,
            permissionId: perm.permissionId,
            grantedActions: perm.availableActions || [],
          })
          .returning();
        console.log('Granted permission', perm.permissionName, 'to SuperAdmin:', rpInserted);
      }
    }
  } catch (err) {
    console.error('Failed to create or update admin user:', err);
    if (err && err.stack) console.error(err.stack);
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('create-admin.js invoked directly, running createAdmin()');
  createAdmin()
    .then(() => {
      console.log('create-admin.js finished successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('create-admin.js failed', err);
      process.exit(1);
    });
}
