<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class ForcePasswordReset
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check() && Auth::user()->force_password_reset) {
            // Allow the specific route to change password and logout
            if (!$request->is('api/user/change-password') && !$request->is('api/auth/logout')) {
                return response()->json([
                    'message' => 'Password reset required.',
                    'force_password_reset' => true
                ], 403);
            }
        }

        return $next($request);
    }
}
