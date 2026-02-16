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
        Schema::table('generated_contracts', function (Blueprint $table) {
            $table->enum('status', ['pending', 'signed', 'rejected'])->default('pending')->after('file_path');
            $table->timestamp('signed_at')->nullable()->after('status');
            $table->string('signed_path')->nullable()->after('signed_at');
            $table->json('signature_metadata')->nullable()->after('signed_path');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('generated_contracts', function (Blueprint $table) {
            $table->dropColumn(['status', 'signed_at', 'signed_path', 'signature_metadata']);
        });
    }
};
