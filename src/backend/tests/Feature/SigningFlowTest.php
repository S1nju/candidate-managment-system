<?php

use App\Models\User;
use App\Modules\Signing\Models\Signature;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a user manages their own saved signatures (stamps)', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    Signature::create(['user_id' => $other->id, 'type' => 'typed', 'value' => 'Other', 'date' => now()->toDateString()]);

    $created = $this->actingAs($user)->postJson('/api/signatures', [
        'type' => 'drawn',
        'value' => 'data:image/png;base64,AAAA',
        'initials' => 'JD',
    ]);
    $created->assertCreated();

    // Only the user's own signatures are listed
    $this->actingAs($user)->getJson('/api/signatures')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.initials', 'JD');

    // Invalid type is rejected
    $this->actingAs($user)->postJson('/api/signatures', ['type' => 'nope', 'value' => 'x'])
        ->assertUnprocessable();

    // A user cannot delete someone else's signature, but can delete their own
    $foreign = Signature::where('user_id', $other->id)->first();
    $this->actingAs($user)->deleteJson("/api/signatures/{$foreign->id}")->assertNotFound();
    $this->actingAs($user)->deleteJson('/api/signatures/'.$created->json('id'))->assertOk();
    $this->assertDatabaseMissing('signatures', ['id' => $created->json('id')]);
});

test('saved signatures require authentication', function () {
    $this->getJson('/api/signatures')->assertUnauthorized();
});

test('public verification returns 404 for an unknown signature hash', function () {
    $this->getJson('/api/public/signature/'.str_repeat('a', 64).'/verify')
        ->assertNotFound()
        ->assertJson(['is_valid' => false, 'status' => 'NOT_FOUND']);
});
