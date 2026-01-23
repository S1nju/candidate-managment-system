<?php

namespace App\Modules\Auth\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    public function login(array $credentials): array
    {
        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        // Access Token (Short Lived)
        $accessToken = $user->createToken('access_token', ['access'], now()->addMinutes(15));
        
        // Refresh Token (Long Lived)
        $refreshToken = $user->createToken('refresh_token', ['issue-access-token'], now()->addWeeks(2));

        return [
            'user' => $user,
            'access_token' => $accessToken->plainTextToken,
            'refresh_token' => $refreshToken->plainTextToken,
        ];
    }

    public function refresh(User $user): array
    {
        // Invalidate the token used to authenticate this request (if it exists)
        if ($user->currentAccessToken()) {
            $user->currentAccessToken()->delete();
        }

        // Issue new Access Token
        $accessToken = $user->createToken('access_token', ['access'], now()->addMinutes(15));
        
        // Issue new Refresh Token
        $refreshToken = $user->createToken('refresh_token', ['issue-access-token'], now()->addWeeks(2));
        
        return [
            'access_token' => $accessToken->plainTextToken,
            'refresh_token' => $refreshToken->plainTextToken,
        ];
    }

    public function logout(User $user): void
    {
        // Revoke the token that was used to authenticate the current request
        $user->currentAccessToken()->delete();
    }
}
