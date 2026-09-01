<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Candidates\Models\Candidate;
use App\Modules\Forms\Models\Form;
use Spatie\Permission\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Illuminate\Support\Facades\DB;

class RoleBasedCandidateFilterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        if (DB::getDriverName() === 'sqlite') {
            $this->markTestSkipped('SQLite does not support adding columns with foreign keys reliably in this environment.');
        }
    }

    public function test_admin_can_see_all_candidates()
    {
        $admin = User::factory()->create();
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $admin->assignRole($adminRole);

        $roleA = Role::create(['name' => 'Role A', 'guard_name' => 'web']);
        $formA = Form::factory()->create(['role_id' => $roleA->id]);
        $candidateA = Candidate::factory()->create(['form_id' => $formA->id]);

        $roleB = Role::create(['name' => 'Role B', 'guard_name' => 'web']);
        $formB = Form::factory()->create(['role_id' => $roleB->id]);
        $candidateB = Candidate::factory()->create(['form_id' => $formB->id]);

        $this->actingAs($admin)
            ->getJson('/api/candidates')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['id' => $candidateA->id])
            ->assertJsonFragment(['id' => $candidateB->id]);
    }

    public function test_worker_sees_only_assigned_form_candidates()
    {
        $roleA = Role::create(['name' => 'Role A', 'guard_name' => 'web']);
        $roleB = Role::create(['name' => 'Role B', 'guard_name' => 'web']);

        $workerA = User::factory()->create();
        $workerA->assignRole($roleA);
        
        $formA = Form::factory()->create(['role_id' => $roleA->id]);
        $candidateA = Candidate::factory()->create(['form_id' => $formA->id]);

        $formB = Form::factory()->create(['role_id' => $roleB->id]);
        $candidateB = Candidate::factory()->create(['form_id' => $formB->id]);

        $formNone = Form::factory()->create(['role_id' => null]);
        $candidateNone = Candidate::factory()->create(['form_id' => $formNone->id]);

        $this->actingAs($workerA)
            ->getJson('/api/candidates')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonFragment(['id' => $candidateA->id])
            ->assertJsonMissing(['id' => $candidateB->id])
            ->assertJsonMissing(['id' => $candidateNone->id]);
    }

    public function test_worker_with_multiple_roles_sees_combined_candidates()
    {
        $roleA = Role::create(['name' => 'Role A', 'guard_name' => 'web']);
        $roleB = Role::create(['name' => 'Role B', 'guard_name' => 'web']);

        $workerAB = User::factory()->create();
        $workerAB->assignRole($roleA);
        $workerAB->assignRole($roleB);

        $formA = Form::factory()->create(['role_id' => $roleA->id]);
        $candidateA = Candidate::factory()->create(['form_id' => $formA->id]);

        $formB = Form::factory()->create(['role_id' => $roleB->id]);
        $candidateB = Candidate::factory()->create(['form_id' => $formB->id]);

        $formC = Role::create(['name' => 'Role C', 'guard_name' => 'web']);
        $formC = Form::factory()->create(['role_id' => $formC->id]);
        $candidateC = Candidate::factory()->create(['form_id' => $formC->id]);

        $this->actingAs($workerAB)
            ->getJson('/api/candidates')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['id' => $candidateA->id])
            ->assertJsonFragment(['id' => $candidateB->id])
            ->assertJsonMissing(['id' => $candidateC->id]);
    }
}
