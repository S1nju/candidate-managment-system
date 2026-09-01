<?php

use App\Modules\Candidates\Http\Controllers\CandidateController;
use App\Modules\Candidates\Http\Controllers\ContractController;
use App\Modules\Candidates\Http\Controllers\ContractLockController;
use App\Modules\Candidates\Http\Controllers\IdentityVerificationController;
use Illuminate\Support\Facades\Route;

Route::get('/candidates/verify-callback', [IdentityVerificationController::class, 'callback'])->middleware('throttle:60,1');
Route::get('/candidates/didit-decision/{sessionId}', [IdentityVerificationController::class, 'getDiditDecision'])->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/candidates', [CandidateController::class, 'index']);
    Route::post('/candidates/email-contracts', [CandidateController::class, 'createEmailContractInvite']);
    Route::get('/candidates/{candidate}', [CandidateController::class, 'show'])->whereNumber('candidate');
    Route::put('/candidates/{candidate}', [CandidateController::class, 'update']);
    Route::post('/candidates/{candidate}/assign', [CandidateController::class, 'assign']);
    Route::post('/candidates/mailto', [CandidateController::class, 'generateMailtoLink']);
    Route::get('/candidates/files', [CandidateController::class, 'downloadFile']);

    Route::post('/candidates/{candidate}/generate-contract', [ContractController::class, 'generate']);
    Route::get('/candidates/{candidate}/preview-contract', [ContractController::class, 'preview']);
    Route::get('/candidates/{candidate}/signing-status', [ContractLockController::class, 'checkStatus']);
    Route::post('/candidates/{candidate}/acquire-lock', [ContractLockController::class, 'acquire']);
    Route::post('/candidates/{candidate}/release-lock', [ContractLockController::class, 'release']);
    Route::post('/candidates/{candidate}/ping', [ContractLockController::class, 'ping']);
    Route::post('/candidates/{candidate}/sign-contract', [ContractController::class, 'sign'])->middleware('throttle:60,1');
    Route::post('/candidates/{candidate}/reject-contract', [ContractController::class, 'reject'])->middleware('throttle:60,1');
    Route::post('/candidates/{candidate}/send-signature-request', [ContractController::class, 'sendSignatureRequest']);
    Route::get('/contracts/{id}', [ContractController::class, 'download'])->where('id', '.*');
});


// Public Candidate Routes
Route::prefix('public/candidate')->group(function () {
    Route::get('/{token}', [\App\Modules\Candidates\Http\Controllers\PublicCandidateController::class, 'show']);
    Route::get('/{token}/preview', [\App\Modules\Candidates\Http\Controllers\PublicCandidateController::class, 'preview']);
    Route::post('/{token}/sign', [\App\Modules\Candidates\Http\Controllers\PublicCandidateController::class, 'sign']);
});
