<?php

namespace App\Modules\Users\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Users\Http\Requests\StoreUserRequest;
use App\Modules\Users\Http\Requests\UpdateUserRequest;
use App\Modules\Users\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(protected UserService $userService) {}

    public function index(Request $request): JsonResponse
    {
        $users = $this->userService->listUsers($request->input('per_page', 15));

        return response()->json($users);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = $this->userService->createUser($request->validated());

        return response()->json($user, 201);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json($user->load('roles'));
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $user = $this->userService->updateUser($user, $request->validated());

        return response()->json($user);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,'.$user->id,
            'bio' => 'nullable|string|max:1000',
        ]);

        $user->update($validated);

        return response()->json($user->load('roles'));
    }

    public function destroy(User $user): JsonResponse
    {
        $this->userService->deleteUser($user);
 
        return response()->json(['message' => 'User deleted successfully']);
    }

    public function getRoles(): JsonResponse
    {
        return response()->json(\Spatie\Permission\Models\Role::all());
    }

    public function getPermissions(): JsonResponse
    {
        return response()->json(\Spatie\Permission\Models\Permission::all());
    }
 
    public function updateRoles(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'roles' => 'required|array',
            'roles.*' => 'string|exists:roles,name',
        ]);
 
        $user->syncRoles($request->roles);
 
        return response()->json($user->load('roles'));
    }
}
