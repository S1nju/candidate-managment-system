<?php

use App\Models\User;
use App\Modules\Candidates\Models\Candidate;
use App\Modules\Forms\Models\Form;
use App\Modules\Forms\Models\FormContract;
use App\Modules\Forms\Models\GeneratedContract;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

test('candidate applies through the public form, signs, then the admin countersigns', function () {
    Mail::fake();

    // The signing services resolve files with storage_path('app/secure/...'), so this test uses
    // the real 'secure' disk and removes whatever it creates.
    $secureFilesBefore = Storage::disk('secure')->allFiles();
    $this->beforeApplicationDestroyed(function () use ($secureFilesBefore) {
        Storage::disk('secure')->delete(array_values(array_diff(Storage::disk('secure')->allFiles(), $secureFilesBefore)));
    });

    $admin = User::factory()->create();
    $admin->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']));

    $form = Form::create(['title' => 'Public form', 'status' => 'active', 'created_by' => $admin->id]);

    $template = new \setasign\Fpdi\TcpdfFpdi;
    $template->setPrintHeader(false);
    $template->setPrintFooter(false);
    $template->AddPage();
    $template->Write(0, 'Contract');
    Storage::disk('secure')->put('templates/candidate-flow.pdf', $template->Output('', 'S'));

    $contract = FormContract::create([
        'form_id' => $form->id,
        'name' => 'Contract',
        'template_path' => 'templates/candidate-flow.pdf',
        'placeholders' => [],
    ]);

    // 1. Candidate applies: the candidate is created and the contract generated automatically
    $apply = $this->postJson("/api/public/forms/{$form->uuid}/submit", [
        'fields' => ['name' => 'Doe', 'email' => 'john@example.com'],
    ]);

    $apply->assertCreated();
    $candidate = Candidate::findOrFail($apply->json('candidate_id'));
    expect($candidate->contract_status)->toBe('pending');
    expect(GeneratedContract::where('candidate_id', $candidate->id)->count())->toBe(1);

    // 2. Admin sends the signature request
    $this->actingAs($admin)
        ->postJson("/api/candidates/{$candidate->id}/send-signature-request")
        ->assertOk();

    $candidate->refresh();
    expect($candidate->contract_status)->toBe('pending_candidate_signature');

    // 3. Candidate signs through the public tokenized link
    $signature = [
        'signatures' => [[
            'type' => 'drawn',
            'value' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'placement' => ['x' => 50, 'y' => 50, 'page' => 1],
        ]],
        'form_contract_id' => $contract->id,
        'ip_address' => '127.0.0.1',
    ];

    $this->postJson("/api/public/candidate/{$candidate->signing_token}/sign", $signature)->assertOk();

    $candidate->refresh();
    expect($candidate->contract_status)->toBe('pending_admin_signature');

    // 4. Admin countersigns: the candidate is fully signed
    $this->actingAs($admin)
        ->postJson("/api/candidates/{$candidate->id}/sign-contract", $signature)
        ->assertOk();

    expect($candidate->fresh()->contract_status)->toBe('signed');
});
