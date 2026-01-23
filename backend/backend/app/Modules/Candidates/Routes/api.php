<?php
 
use App\Modules\Candidates\Http\Controllers\CandidateController;
use App\Modules\Candidates\Http\Controllers\ContractController;
use Illuminate\Support\Facades\Route;
 
Route::post('/candidates', [CandidateController::class, 'store']);
 
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/candidates', [CandidateController::class, 'index']);
    Route::get('/candidates/{candidate}', [CandidateController::class, 'show']);
    Route::put('/candidates/{candidate}', [CandidateController::class, 'update']);
    
    Route::post('/candidates/{candidate}/generate-contract', [ContractController::class, 'generate']);
    Route::post('/candidates/{candidate}/sign-contract', [ContractController::class, 'sign'])->middleware('throttle:60,1');
    Route::post('/candidates/{candidate}/reject-contract', [ContractController::class, 'reject'])->middleware('throttle:60,1');
    Route::get('/contracts/{filename}', [ContractController::class, 'download'])->where('filename', '.*');
});
