<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

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
        $this->app->bind(\App\Modules\Documents\Repositories\DocumentRepository::class, \App\Modules\Documents\Repositories\DocumentRepository::class);
        $this->app->bind(\App\Modules\Audit\Services\AuditService::class, \App\Modules\Audit\Services\AuditService::class);
        $this->app->bind(\App\Modules\Documents\Services\DocumentService::class, \App\Modules\Documents\Services\DocumentService::class);
        $this->app->bind(\App\Modules\Signing\Services\SigningService::class, \App\Modules\Signing\Services\SigningService::class);
        $this->app->bind(\App\Modules\Documents\Http\Controllers\DocumentController::class, \App\Modules\Documents\Http\Controllers\DocumentController::class);
        $this->app->bind(\App\Modules\Documents\Http\Requests\StoreDocumentRequest::class, function ($app) {
             return new \App\Modules\Documents\Http\Requests\StoreDocumentRequest();
        });
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        $modulesPath = app_path('Modules');
        
        if (!is_dir($modulesPath)) {
            return;
        }

        $modules = glob($modulesPath . '/*', GLOB_ONLYDIR);

        foreach ($modules as $module) {
            $moduleName = basename($module);

            // Load Routes
            if (file_exists($module . '/Routes/api.php')) {
                Route::prefix('api')
                    ->middleware('api')
                    ->group($module . '/Routes/api.php');
            }

            if (file_exists($module . '/Routes/web.php')) {
                Route::middleware('web')
                    ->group($module . '/Routes/web.php');
            }

            // Load Migrations
            if (is_dir($module . '/Database/Migrations')) {
                $this->loadMigrationsFrom($module . '/Database/Migrations');
            }
        }

        \Illuminate\Support\Facades\Gate::policy(\App\Modules\Documents\Models\Document::class, \App\Modules\Documents\Policies\DocumentPolicy::class);
    }
}
