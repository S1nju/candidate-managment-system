<?php

use App\Modules\Forms\Http\Controllers\EmailContractController;
use App\Modules\Forms\Http\Controllers\FormContractController;
use App\Modules\Forms\Http\Controllers\FormController;
use App\Modules\Forms\Http\Controllers\LibraryDocumentController;
use App\Modules\Forms\Http\Controllers\PublicFormController;
use Illuminate\Support\Facades\Route;

// Admin routes - protected by auth
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('forms', FormController::class);
    Route::post('forms/{form}/duplicate', [FormController::class, 'duplicate']);
    Route::post('forms/{form}/completion-attachment', [FormController::class, 'uploadCompletionAttachment']);
    Route::get('forms/{formId}/contracts/{id}/template', [FormContractController::class, 'downloadTemplate']);
    Route::get('generated-contracts/{id}/download', [FormContractController::class, 'downloadGenerated']);
    Route::apiResource('forms.contracts', FormContractController::class);

    // Email Contracts
    Route::apiResource('email-contracts', EmailContractController::class);
    Route::post('email-contracts/upload-template', [EmailContractController::class, 'uploadTemplate']);
    Route::post('email-contracts/send', [EmailContractController::class, 'send']);

    // Document library (reusable PDFs, mergeable into generated contracts)
    Route::get('library-documents/{libraryDocument}/download', [LibraryDocumentController::class, 'download']);
    Route::put('library-documents/{libraryDocument}/elements', [LibraryDocumentController::class, 'updateElements']);
    Route::apiResource('library-documents', LibraryDocumentController::class)->except(['show']);
});

// Public routes - no authentication required
Route::get('public/forms/{uuid}', [PublicFormController::class, 'show']);
Route::post('public/forms/{uuid}/submit', [PublicFormController::class, 'submit']);
