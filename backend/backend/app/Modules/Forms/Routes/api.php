<?php

use App\Modules\Forms\Http\Controllers\FormController;
use App\Modules\Forms\Http\Controllers\PublicFormController;
use App\Modules\Forms\Http\Controllers\FormContractController;
use Illuminate\Support\Facades\Route;

// Admin routes - protected by auth
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('forms', FormController::class);
    Route::post('forms/{form}/completion-attachment', [FormController::class, 'uploadCompletionAttachment']);
    Route::get('forms/{formId}/contracts/{id}/template', [FormContractController::class, 'downloadTemplate']);
    Route::get('generated-contracts/{id}/download', [FormContractController::class, 'downloadGenerated']);
    Route::apiResource('forms.contracts', FormContractController::class);
});

// Public routes - no authentication required
Route::get('public/forms/{uuid}', [PublicFormController::class, 'show']);
Route::post('public/forms/{uuid}/submit', [PublicFormController::class, 'submit']);
