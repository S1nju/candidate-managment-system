<?php

use App\Models\User;
use App\Modules\Candidates\Models\Candidate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('candidate can apply and sign contract', function () {
    $this->withoutExceptionHandling();
    // 1. Apply
    $response = $this->postJson('/api/candidates', [
        'name' => 'John Doe',
        'email' => 'john@example.com',
        'phone' => '1234567890',
        'social_security_number' => '123456789012345',
        'gender' => 'Homme',
        'nationality' => 'Française',
        'dob' => '1990-01-01',
        'address' => '1 Rue de la Paix',
        'emergency_phone' => '0987654321',
        'recruitment_city' => 'Paris',
        'animator_name' => 'Animator',
        'product_justcost' => 'FREE STRATYGO',
        'contract_type' => 'CDI',
        'start_date' => '2023-01-01',
    ]);

    $response->assertStatus(201);
    $candidateId = $response->json('id');
    $user = User::factory()->create();
    $token = $user->createToken('test-token')->plainTextToken; // Create token once

    // 2. Generate Contract
    $genResponse = $this->withHeaders(['Authorization' => 'Bearer '.$token])
        ->postJson("/api/candidates/{$candidateId}/generate-contract");
    $genResponse->assertStatus(200);
    $file = $genResponse->json('file');
    expect($file)->toEndWith('.pdf');

    // 3. Sign Contract (new endpoint)
    // $user = User::factory()->create(); // Already created

    // Sanctum::actingAs($user, ['*']);
    // $token = $user->createToken('test-token')->plainTextToken;

    $signResponse = $this->withHeaders(['Authorization' => 'Bearer '.$token])
        ->postJson("/api/candidates/{$candidateId}/sign-contract", [
            'signatures' => [
                [
                    'type' => 'drawn',
                    'value' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                    'placement' => ['x' => 50, 'y' => 50, 'page' => 1],
                ],
            ],
            'ip_address' => 'localhost',
        ]);

    $signResponse->assertStatus(200);

    // 4. Verify relation
    $candidate = Candidate::find($candidateId);
    expect($candidate->signature_id)->not->toBeNull();
    // expect($candidate->contract_signed)->toBeTrue(); // If we added this field
});
