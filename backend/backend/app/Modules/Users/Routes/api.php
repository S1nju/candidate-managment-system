<?php

use App\Modules\Users\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->group(function () {
    Route::put('/profile', [UserController::class, 'updateProfile']);
    Route::put('/change-password', [UserController::class, 'changePassword']);

    Route::middleware(['role:admin'])->prefix('admin')->group(function () {
        Route::get('/roles', [\App\Modules\Users\Http\Controllers\AdminUserController::class, 'getRoles']);
        Route::get('/permissions', [\App\Modules\Users\Http\Controllers\AdminUserController::class, 'getPermissions']);
        Route::post('/users/{user}/roles', [UserController::class, 'updateRoles']);
        Route::post('/users/{user}/reset-password', [\App\Modules\Users\Http\Controllers\AdminUserController::class, 'resetPassword']);
        Route::post('/users/{id}/restore', [\App\Modules\Users\Http\Controllers\AdminUserController::class, 'restore']);
        Route::apiResource('users', \App\Modules\Users\Http\Controllers\AdminUserController::class);
        Route::apiResource('roles', \App\Modules\Users\Http\Controllers\RoleController::class);
    });
});
