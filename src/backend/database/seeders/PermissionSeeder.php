<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // create permissions
        $permissions = [
            'view documents',
            'create documents',
            'edit documents',
            'delete documents',
            'sign documents',
            'reject documents',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // create roles and assign existing permissions
        $admin = Role::where('name', 'admin')->first();
        $admin->givePermissionTo(Permission::all());

        $worker = Role::where('name', 'worker')->first();
        $worker->givePermissionTo(['view documents', 'sign documents', 'reject documents']);
    }
}
