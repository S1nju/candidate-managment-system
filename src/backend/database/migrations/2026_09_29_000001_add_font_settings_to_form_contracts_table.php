<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('form_contracts', function (Blueprint $table) {
            $table->string('font_family', 32)->nullable()->after('annex_rules');
            $table->unsignedTinyInteger('font_size')->nullable()->after('font_family');
        });
    }

    public function down(): void
    {
        Schema::table('form_contracts', function (Blueprint $table) {
            $table->dropColumn(['font_family', 'font_size']);
        });
    }
};
