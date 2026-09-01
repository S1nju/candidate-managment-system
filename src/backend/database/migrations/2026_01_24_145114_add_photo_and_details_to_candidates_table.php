<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {

        Schema::table('candidates', function (Blueprint $table) {
            if (!Schema::hasColumn('candidates', 'photo_url')) {
                $table->string('photo_url')->nullable();
            }
            if (!Schema::hasColumn('candidates', 'gender')) {
                $table->string('gender')->nullable();
            }
            if (!Schema::hasColumn('candidates', 'nationality')) {
                $table->string('nationality')->nullable();
            }
            if (!Schema::hasColumn('candidates', 'dob')) {
                $table->date('dob')->nullable();
            }
            if (!Schema::hasColumn('candidates', 'address')) {
                $table->text('address')->nullable();
            }
            if (!Schema::hasColumn('candidates', 'social_security_number')) {
                $table->string('social_security_number')->nullable();
            }
            if (!Schema::hasColumn('candidates', 'emergency_phone')) {
                $table->string('emergency_phone')->nullable();
            }
            if (!Schema::hasColumn('candidates', 'recruitment_city')) {
                $table->string('recruitment_city')->nullable();
            }
            if (!Schema::hasColumn('candidates', 'animator_name')) {
                $table->string('animator_name')->nullable();
            }
            if (!Schema::hasColumn('candidates', 'product_justcost')) {
                $table->string('product_justcost')->nullable();
            }
            if (!Schema::hasColumn('candidates', 'contract_type')) {
                $table->string('contract_type')->nullable();
            }
            if (!Schema::hasColumn('candidates', 'start_date')) {
                $table->date('start_date')->nullable();
            }
            if (!Schema::hasColumn('candidates', 'signature_id')) {
                $table->foreignId('signature_id')->nullable()->constrained('signatures')->nullOnDelete();
            }
            if (!Schema::hasColumn('candidates', 'skills')) {
                $table->json('skills')->nullable();
            }
            if (!Schema::hasColumn('candidates', 'education')) {
                $table->json('education')->nullable();
            }
            if (!Schema::hasColumn('candidates', 'contract_status')) {
                $table->string('contract_status')->default('draft');
            }
            if (!Schema::hasColumn('candidates', 'contract_path')) {
                $table->string('contract_path')->nullable();
            }
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('candidates', function (Blueprint $table) {
            $table->dropColumn([
                'photo_url',
                'gender',
                'nationality',
                'dob',
                'address',
                'social_security_number',
                'emergency_phone',
                'recruitment_city',
                'animator_name',
                'product_justcost',
                'contract_type',
                'start_date',
                'signature_id',
                'skills',
                'education',
                'contract_status',
                'contract_path',
            ]);
        });
    }
};
