<?php
 
use App\Modules\Analytics\Http\Controllers\AnalyticsController;
use Illuminate\Support\Facades\Route;
 
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/analytics/candidates', [AnalyticsController::class, 'candidateAnalytics']);
});
