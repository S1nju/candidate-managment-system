<?php
 
use App\Modules\Documents\Http\Controllers\DocumentController;
use Illuminate\Support\Facades\Route;
 
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/documents', [DocumentController::class, 'index']);
    Route::post('/documents', [DocumentController::class, 'store']);
    Route::get('/documents/{document}', [DocumentController::class, 'show']);
    Route::get('/documents/{document}/preview', [DocumentController::class, 'preview']);
    Route::post('/documents/{document}/assign', [DocumentController::class, 'assign']);
});
