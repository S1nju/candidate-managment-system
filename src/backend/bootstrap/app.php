<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        $middleware->trustProxies(at: '*');
        // Keep leading/trailing spaces of concat separators (e.g. " - ").
        $middleware->trimStrings(except: ['placeholders.*.separator']);
        $middleware->validateCsrfTokens(except: [
            'api/public/candidate/*/sign',
            'api/candidates/*/sign-contract',
        ]);
        $middleware->api(append: [
            \App\Http\Middleware\ForcePasswordReset::class,
        ]);

        $middleware->redirectTo(
            guests: fn () => response()->json(['message' => 'Unauthenticated.'], 401)
        );

        $middleware->alias([
            'ability' => \Laravel\Sanctum\Http\Middleware\CheckForAnyAbility::class,
            'abilities' => \Laravel\Sanctum\Http\Middleware\CheckAbilities::class,
            'force_password_reset' => \App\Http\Middleware\ForcePasswordReset::class,
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
            'throttle' => \Illuminate\Routing\Middleware\ThrottleRequests::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->report(function (\Throwable $e) {
            error_log('EMERGENCY ERROR: '.$e->getMessage().' in '.$e->getFile().':'.$e->getLine());
            error_log($e->getTraceAsString());
        });
    })->create();
