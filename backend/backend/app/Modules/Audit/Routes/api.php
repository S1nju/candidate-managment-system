<?php

use App\Modules\Audit\Http\Controllers\AuditController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::get('/audit-logs', [AuditController::class, 'index']);
    Route::get('/audit-logs/filters', [AuditController::class, 'filters']);
});
