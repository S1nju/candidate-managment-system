<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('library_documents', function (Blueprint $table) {
            $table->json('elements')->nullable()->after('size');
        });
    }

    public function down(): void
    {
        Schema::table('library_documents', function (Blueprint $table) {
            $table->dropColumn('elements');
        });
    }
};
