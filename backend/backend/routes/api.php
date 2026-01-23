<?php
 
use Illuminate\Support\Facades\Route;
 
/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| All routes are modularized in App\Modules\*\Routes\api.php
| and automatically loaded by ModuleServiceProvider.
|
*/
 
Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});
