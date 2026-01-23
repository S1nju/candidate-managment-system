<?php

use App\Modules\Users\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->group(function () {
    Route::put('/profile', [UserController::class, 'updateProfile']);

    Route::middleware(['role:admin'])->group(function () {
        Route::get('/roles', [UserController::class, 'getRoles']);
        Route::get('/permissions', [UserController::class, 'getPermissions']);
        Route::post('/users/{user}/roles', [UserController::class, 'updateRoles']);
        Route::apiResource('users', UserController::class);
    });
});
