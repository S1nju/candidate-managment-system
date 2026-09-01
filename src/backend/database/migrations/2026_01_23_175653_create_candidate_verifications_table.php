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
        Schema::create('candidate_verifications', function (Blueprint $schema) {
            $schema->id();
            $schema->string('session_id')->unique();
            $schema->json('form_data');
            $schema->string('status')->default('pending');
            $schema->string('verification_url')->nullable();
            $schema->timestamps();
        });
    }
 
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('candidate_verifications');
    }
};
