<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/debug-error', function () {
    throw new \Exception("This is a test exception for debugging 500 errors.");
});
