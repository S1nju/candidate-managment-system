<?php

namespace App\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class ModuleServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        $this->app->bind(\App\Modules\Users\Repositories\UserRepository::class, \App\Modules\Users\Repositories\UserRepository::class);
        $this->app->bind(\App\Modules\Users\Services\UserService::class, \App\Modules\Users\Services\UserService::class);
        $this->app->bind(\App\Modules\Auth\Services\AuthService::class, \App\Modules\Auth\Services\AuthService::class);
        $this->app->bind(\App\Modules\Audit\Services\AuditService::class, \App\Modules\Audit\Services\AuditService::class);
        $this->app->bind(\App\Modules\Signing\Services\SigningService::class, \App\Modules\Signing\Services\SigningService::class);
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        $modulesPath = app_path('Modules');

        if (! is_dir($modulesPath)) {
            return;
        }

        $modules = glob($modulesPath.'/*', GLOB_ONLYDIR);

        foreach ($modules as $module) {
            $moduleName = basename($module);

            // Load Routes
            if (file_exists($module.'/Routes/api.php')) {
                Route::prefix('api')
                    ->middleware('api')
                    ->group($module.'/Routes/api.php');
            }

            if (file_exists($module.'/Routes/web.php')) {
                Route::middleware('web')
                    ->group($module.'/Routes/web.php');
            }

            // Load Migrations
            if (is_dir($module.'/Database/Migrations')) {
                $this->loadMigrationsFrom($module.'/Database/Migrations');
            }
        }
    }
}
