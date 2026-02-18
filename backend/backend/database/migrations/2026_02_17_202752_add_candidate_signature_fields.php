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
            $table->string('signing_token')->nullable()->unique()->after('signing_session_id');
            $table->timestamp('sent_for_signature_at')->nullable()->after('signing_token');
            $table->timestamp('signed_by_candidate_at')->nullable()->after('sent_for_signature_at');

            // Change contract_status to string to support new statuses
            // We use DB::statement for Postgres ENUM modification if needed, but since it was ENUM in migration...
            // Actually, in previous migration it was enum. To change to string in Laravel:
            $table->string('contract_status')->default('pending')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('candidates', function (Blueprint $table) {
            $table->dropColumn(['signing_token', 'sent_for_signature_at', 'signed_by_candidate_at']);
            // Reverting enum is tricky without raw SQL, but we can leave it as string or try to revert
        });
    }
};
