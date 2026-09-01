<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create Roles
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $workerRole = Role::firstOrCreate(['name' => 'worker']);

        // Create Admin User
        $admin = User::firstOrCreate(
            ['email' => 'admin@signme.com'],
            [
                'name' => 'Admin User',
                'password' => bcrypt('password'),
            ]
        );
        $admin->assignRole($adminRole);

        // Create Worker User
        $worker = User::firstOrCreate(
            ['email' => 'worker@signme.com'],
            [
                'name' => 'Worker User',
                'password' => bcrypt('password'),
            ]
        );
        $worker->assignRole($workerRole);
    }
}
