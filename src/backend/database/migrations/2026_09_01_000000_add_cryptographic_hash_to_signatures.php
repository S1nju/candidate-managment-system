<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('document_signatures')) {
            Schema::table('document_signatures', function (Blueprint $table) {
                if (!Schema::hasColumn('document_signatures', 'signature_hash')) {
                    $table->string('signature_hash', 64)->nullable()->index()->after('signed_at');
                }
                if (!Schema::hasColumn('document_signatures', 'pdf_checksum')) {
                    $table->string('pdf_checksum', 64)->nullable()->after('signature_hash');
                }
            });
        }

        if (Schema::hasTable('generated_contracts')) {
            Schema::table('generated_contracts', function (Blueprint $table) {
                if (!Schema::hasColumn('generated_contracts', 'signature_hash')) {
                    $table->string('signature_hash', 64)->nullable()->index()->after('signed_at');
                }
                if (!Schema::hasColumn('generated_contracts', 'pdf_checksum')) {
                    $table->string('pdf_checksum', 64)->nullable()->after('signature_hash');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('document_signatures')) {
            Schema::table('document_signatures', function (Blueprint $table) {
                $table->dropColumn(['signature_hash', 'pdf_checksum']);
            });
        }

        if (Schema::hasTable('generated_contracts')) {
            Schema::table('generated_contracts', function (Blueprint $table) {
                $table->dropColumn(['signature_hash', 'pdf_checksum']);
            });
        }
    }
};
