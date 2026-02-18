<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop the check constraint that was created when contract_status was an ENUM
        // PostgreSQL creates a check constraint for ENUM-like columns
        DB::statement('ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_contract_status_check');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Recreate the original check constraint with old ENUM values
        DB::statement("ALTER TABLE candidates ADD CONSTRAINT candidates_contract_status_check CHECK (contract_status IN ('pending', 'signed', 'rejected'))");
    }
};
