<?php

namespace App\Modules\Users\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AdminUserController extends Controller
{
    /**
     * Display a listing of users.
     */
    public function index()
    {
        return response()->json(\App\Models\User::withTrashed()->with('roles')->get());
    }

    /**
     * Store a newly created user.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => ['required', Password::defaults()],
            'roles' => 'array',
            'roles.*' => 'string|exists:roles,name',
            'force_password_reset' => 'boolean',
        ]);

        $user = \App\Models\User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'force_password_reset' => $validated['force_password_reset'] ?? false,
        ]);

        if (! empty($validated['roles'])) {
            $user->syncRoles($validated['roles']);
        }

        return response()->json($user->load('roles'), 201);
    }

    /**
     * Display the specified user.
     */
    public function show(\App\Models\User $user)
    {
        return response()->json($user->load('roles'));
    }

    /**
     * Update the specified user.
     */
    public function update(Request $request, \App\Models\User $user)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,'.$user->id,
            'roles' => 'array',
            'roles.*' => 'string|exists:roles,name',
        ]);

        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
        ]);

        if (isset($validated['roles'])) {
            $user->syncRoles($validated['roles']);
        }

        return response()->json($user->load('roles'));
    }

    /**
     * Reset or change password for any user.
     */
    public function resetPassword(Request $request, \App\Models\User $user)
    {
        $validated = $request->validate([
            'password' => ['required', Password::defaults()],
            'force_reset' => 'boolean',
        ]);

        $user->update([
            'password' => Hash::make($validated['password']),
            'force_password_reset' => $validated['force_reset'] ?? false,
        ]);

        return response()->json(['message' => 'Password reset successfully']);
    }

    /**
     * Delete a user (soft delete).
     */
    public function destroy(\App\Models\User $user)
    {
        // Prevent self-deletion
        if (auth()->id() === $user->id) {
            return response()->json(['message' => 'You cannot delete your own account'], 400);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted successfully (soft delete)']);
    }

    /**
     * Restore a soft-deleted user.
     */
    public function restore($id)
    {
        $user = \App\Models\User::withTrashed()->findOrFail($id);
        $user->restore();

        return response()->json(['message' => 'User restored successfully']);
    }

    /**
     * Get all available roles.
     */
    public function getRoles()
    {
        return response()->json(\Spatie\Permission\Models\Role::all());
    }

    /**
     * Get all available permissions.
     */
    public function getPermissions()
    {
        return response()->json(\Spatie\Permission\Models\Permission::all());
    }
}
