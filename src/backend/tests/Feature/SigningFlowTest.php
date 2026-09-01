<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Documents\Models\Document;
use App\Modules\Signing\Models\DocumentSignature;
use App\Modules\Audit\Models\AuditLog;
use App\Modules\Notifications\Notifications\DocumentAssignedNotification;
use App\Modules\Notifications\Notifications\DocumentSignedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SigningFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_full_signing_flow()
    {
        try {
            Storage::fake('secure');
            Storage::fake('public');
            Notification::fake();
            $this->withoutExceptionHandling();

            // 1. Setup Data
            $adminRole = Role::create(['name' => 'admin']);
            $workerRole = Role::create(['name' => 'worker']);

            $admin = User::factory()->create();
            $admin->assignRole($adminRole);

            $worker = User::factory()->create();
            $worker->assignRole($workerRole);

            // 2. Admin Uploads Document
            $response = $this->actingAs($admin)
                ->postJson('/api/documents', [
                    'title' => 'Contract',
                    'description' => 'Please sign this',
                    'file' => UploadedFile::fake()->create('contract.pdf', 100),
                    'assigned_to' => $worker->id,
                ]);

            $response->assertStatus(201);
            $documentId = $response->json('id');
            
            $this->assertDatabaseHas('documents', [
                'id' => $documentId,
                'title' => 'Contract',
                'status' => 'sent', // Assigned immediately
                'assigned_to' => $worker->id,
            ]);

            Storage::disk('secure')->assertExists($response->json('file_path'));

            // Verify Audit Log (Uploaded & Assigned)
            $this->assertDatabaseHas('audit_logs', ['action' => 'document_uploaded', 'auditable_id' => $documentId]);
            $this->assertDatabaseHas('audit_logs', ['action' => 'document_assigned', 'auditable_id' => $documentId]);

            // Verify Notification sent to Worker
            Notification::assertSentTo($worker, DocumentAssignedNotification::class);

            // 3. Worker Views Document
            $response = $this->actingAs($worker)->getJson('/api/documents');
            $response->assertOk();
            $response->assertJsonFragment(['title' => 'Contract']);

            // 4. Worker Signs Document
            $response = $this->actingAs($worker)
                ->postJson("/api/documents/{$documentId}/sign", [
                    'type' => 'text',
                    'value' => 'John Doe',
                ]);

            $response->assertOk();
            
            $this->assertDatabaseHas('documents', [
                'id' => $documentId,
                'status' => 'signed',
            ]);

            $this->assertDatabaseHas('document_signatures', [
                'document_id' => $documentId,
                'user_id' => $worker->id,
                'signature_value' => 'John Doe',
            ]);

            // Verify Audit Log (Signed)
            $this->assertDatabaseHas('audit_logs', ['action' => 'document_signed', 'auditable_id' => $documentId]);

            // Verify Notification sent to Admin (Owner)
            Notification::assertSentTo($admin, DocumentSignedNotification::class);
        } catch (\Throwable $e) {
            fwrite(STDERR, "EXCEPTION: " . $e->getMessage() . "\n" . $e->getTraceAsString());
            throw $e;
        }
    }
}
