<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TokenRotationTestPHPUnit extends TestCase
{
    use RefreshDatabase;

    public function test_token_rotation_flow()
    {
        $this->withoutExceptionHandling();

        // 1. Login
        $user = User::factory()->create();
        
        $response = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password', // Factory default
        ]);

        $response->assertOk();
        $refreshToken = $response->json('data.refresh_token');
        $accessToken = $response->json('data.access_token');
        
        $this->assertNotEmpty($refreshToken);
        $this->assertNotEmpty($accessToken);

        // 2. Refresh Token
        // Use Refresh Token for auth (it must have 'issue-access-token' ability)
        $response = $this->withHeader('Authorization', 'Bearer ' . $refreshToken)->postJson('/api/refresh');
        
        $response->assertOk();
        $response->assertJsonStructure([
            'data' => [
                'access_token',
                'refresh_token',
            ]
        ]);
        
        $newRefreshToken = $response->json('data.refresh_token');
        $newAccessToken = $response->json('data.access_token');
        // Assert rotation happened
        $this->assertNotEquals($accessToken, $newAccessToken);
        $this->assertNotEquals($refreshToken, $newRefreshToken);
        
        // Verify the old token is gone from DB
        // We expect only 2 tokens now (new Access + new Refresh). The old 2 should be gone (or at least the old Refresh).
        // Actually, old Access token was NOT deleted by our logic (we only deleted the used Refresh token).
        // So we might have: Old Access (expiring), New Access, New Refresh. total 3.
        // But Old Refresh should be gone.
        // We can't know the ID easily without querying.
        // But we know the total count should be 3 (1 initial access + 2 new).
        // Initial Refresh (used) should be deleted.
        $this->assertDatabaseCount('personal_access_tokens', 3);

        // Reset guards to ensure fresh authentication check
        auth()->forgetGuards();

        // Re-enable exception handling to assert 401 response instead of crash
        $this->withExceptionHandling();

        // 3. Verify Old Refresh Token is Invalidated
        // Try to use the OLD refresh token again on the refresh endpoint.
        $response = $this->withHeader('Authorization', 'Bearer ' . $refreshToken)->postJson('/api/refresh');
        
        $response->assertUnauthorized();
    }
}
