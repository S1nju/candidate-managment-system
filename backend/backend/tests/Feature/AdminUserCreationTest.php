<?php

use App\Models\User;
use Spatie\Permission\Models\Role;

use Laravel\Sanctum\Sanctum;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
   // Ensure roles exist for api guard as well if needed, or web. 
   // Sanctum usually uses web guard for check if not SPA.
   Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
   Role::firstOrCreate(['name' => 'worker', 'guard_name' => 'web']);
});

test('public registration is disabled', function () {
    $response = $this->postJson('/api/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertNotFound();
});

test('admin can create a user', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    Sanctum::actingAs($admin);

    $response = $this->postJson('/api/users', [
        'name' => 'Worker One',
        'email' => 'worker1@test.com',
        'password' => 'password',
        'roles' => ['admin'] 
    ]);

    $response->assertCreated();
    $this->assertDatabaseHas('users', ['email' => 'worker1@test.com']);
});

test('non-admin cannot create a user', function () {
    $user = User::factory()->create(); // No admin role
    Sanctum::actingAs($user);

    $response = $this->postJson('/api/users', [
        'name' => 'Worker Two',
        'email' => 'worker2@test.com',
        'password' => 'password',
    ]);

    $response->assertForbidden();
});
