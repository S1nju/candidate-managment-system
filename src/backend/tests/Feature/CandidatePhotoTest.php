<?php

use App\Models\User;
use App\Modules\Candidates\Models\CandidateVerification;
use App\Modules\Forms\Models\Form;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['services.didit.api_key' => 'fake', 'services.didit.workflow_id' => 'fake']);
});

test('a KYC-enabled form returns a Didit redirect instead of creating the candidate', function () {
    Http::fake([
        'https://verification.didit.me/*' => Http::response([
            'url' => 'http://fake-verification.com',
            'session_id' => '123456',
        ], 200),
    ]);

    $admin = User::factory()->create();
    $form = Form::create([
        'title' => 'KYC form',
        'status' => 'active',
        'kyc_enabled' => true,
        'created_by' => $admin->id,
    ]);

    $response = $this->postJson("/api/public/forms/{$form->uuid}/submit", [
        'fields' => ['name' => 'Jane', 'email' => 'jane@example.com'],
    ]);

    $response->assertCreated()
        ->assertJson(['kyc_required' => true, 'kyc_redirect_url' => 'http://fake-verification.com']);

    // The candidate is only created after the Didit callback; the form data waits in a verification record
    $this->assertDatabaseMissing('candidates', ['email' => 'jane@example.com']);
    expect(CandidateVerification::where('session_id', '123456')->exists())->toBeTrue();
});

test('KYC failure is reported without creating anything', function () {
    Http::fake(['https://verification.didit.me/*' => Http::response(['error' => 'boom'], 500)]);

    $admin = User::factory()->create();
    $form = Form::create(['title' => 'KYC form', 'status' => 'active', 'kyc_enabled' => true, 'created_by' => $admin->id]);

    $this->postJson("/api/public/forms/{$form->uuid}/submit", [
        'fields' => ['name' => 'Jane', 'email' => 'jane@example.com'],
    ])->assertStatus(500);

    $this->assertDatabaseMissing('candidates', ['email' => 'jane@example.com']);
});
