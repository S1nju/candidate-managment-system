<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Spatie\Permission\Models\Role;

class UserRoleSeeder extends Seeder
{
    public function run(): void
    {
        // Create roles if they don't exist
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $workerRole = Role::firstOrCreate(['name' => 'worker']);

        // Assign admin role to user ID 1
        $user = User::find(1);
        
        if ($user && !$user->hasRole('admin')) {
            $user->assignRole('admin');
            $this->command->info("Assigned 'admin' role to user ID 1: {$user->email}");
        } elseif ($user) {
            $this->command->info("User ID 1 ({$user->email}) already has 'admin' role");
        } else {
            $this->command->warn("User with ID 1 not found in the database");
        }
    }
}
