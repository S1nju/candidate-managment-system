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
            $table->unsignedBigInteger('version')->default(0)->after('contract_path');
            $table->timestamp('contract_signed_at')->nullable()->after('version');
            $table->unsignedBigInteger('signed_by_user_id')->nullable()->after('contract_signed_at');

            // Soft lock fields
            $table->unsignedBigInteger('signing_in_progress_by')->nullable()->after('signed_by_user_id');
            $table->timestamp('signing_started_at')->nullable()->after('signing_in_progress_by');

            $table->foreign('signed_by_user_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('signing_in_progress_by')->references('id')->on('users')->nullOnDelete();
            $table->index(['contract_status', 'version']);
            $table->index(['signing_in_progress_by', 'signing_started_at']); // For timeout queries
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('candidates', function (Blueprint $table) {
            $table->dropForeign(['signed_by_user_id']);
            $table->dropForeign(['signing_in_progress_by']);
            $table->dropIndex(['contract_status', 'version']);
            $table->dropIndex(['signing_in_progress_by', 'signing_started_at']);

            $table->dropColumn([
                'version',
                'contract_signed_at',
                'signed_by_user_id',
                'signing_in_progress_by',
                'signing_started_at',
            ]);
        });
    }
};
