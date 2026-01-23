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
            $table->string('gender')->nullable();
            $table->string('nationality')->nullable();
            $table->date('dob')->nullable();
            $table->text('address')->nullable();
            $table->string('social_security_number', 15)->nullable();
            $table->string('emergency_phone')->nullable();
            $table->string('recruitment_city')->nullable();
            $table->string('animator_name')->nullable();
            $table->string('product_justcost')->nullable();
            $table->string('contract_type')->nullable();
            $table->date('start_date')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('candidates', function (Blueprint $table) {
            $table->dropColumn([
                'gender', 'nationality', 'dob', 'address', 'social_security_number',
                'emergency_phone', 'recruitment_city', 'animator_name',
                'product_justcost', 'contract_type', 'start_date'
            ]);
        });
    }
};
