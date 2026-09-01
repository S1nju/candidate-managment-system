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
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_contract_status_check');

            return;
        }

        if ($driver === 'mysql') {
            $database = DB::getDatabaseName();

            $constraint = DB::selectOne(
                "SELECT CONSTRAINT_NAME
                 FROM information_schema.TABLE_CONSTRAINTS
                 WHERE CONSTRAINT_SCHEMA = ?
                   AND TABLE_NAME = 'candidates'
                   AND CONSTRAINT_NAME = 'candidates_contract_status_check'
                   AND CONSTRAINT_TYPE = 'CHECK'
                 LIMIT 1",
                [$database]
            );

            if ($constraint) {
                DB::statement('ALTER TABLE candidates DROP CHECK candidates_contract_status_check');
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        if (! in_array($driver, ['pgsql', 'mysql'], true)) {
            return;
        }

        try {
            DB::statement("ALTER TABLE candidates ADD CONSTRAINT candidates_contract_status_check CHECK (contract_status IN ('pending', 'signed', 'rejected'))");
        } catch (\Throwable) {
        }
    }
};
