<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('document_signatures')) {
            Schema::create('document_signatures', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('document_id')->nullable();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->string('signature_type')->default('text'); // text, image
                $table->text('signature_value'); // The name typed or path to signature image
                $table->string('ip_address')->nullable();
                $table->string('user_agent')->nullable();
                $table->timestamp('signed_at');
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('document_signatures');
    }
};
