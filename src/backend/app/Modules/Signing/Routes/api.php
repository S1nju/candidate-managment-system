<?php
 
use App\Modules\Signing\Http\Controllers\SignatureController;
use App\Modules\Signing\Http\Controllers\SignatureVerificationController;
use App\Modules\Signing\Http\Controllers\SigningController;
use Illuminate\Support\Facades\Route;

Route::get('/public/signature/{hash}/verify', [SignatureVerificationController::class, 'verify'])->middleware('throttle:60,1');
 
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/signatures', [SignatureController::class, 'index']);
    Route::post('/signatures', [SignatureController::class, 'store']);
    Route::post('/signatures/upload', [SignatureController::class, 'upload']);
    Route::delete('/signatures/{id}', [SignatureController::class, 'destroy']);
    
    Route::post('/documents/{document}/sign', [SigningController::class, 'sign']);
});

