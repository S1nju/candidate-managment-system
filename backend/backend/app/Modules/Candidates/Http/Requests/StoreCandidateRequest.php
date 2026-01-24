<?php

namespace App\Modules\Candidates\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCandidateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:20',
            'position' => 'nullable|string|max:255',
            'photo' => 'nullable|image|max:2048', // 2MB Max
            'gender' => 'nullable|string|in:male,female,other',
            'nationality' => 'nullable|string|max:255',
            'dob' => 'nullable|date',
            'address' => 'nullable|string|max:500',
            'social_security_number' => 'nullable|string|max:255',
            'emergency_phone' => 'nullable|string|max:20',
            'recruitment_city' => 'nullable|string|max:255',
            'cv' => 'nullable|file|mimes:pdf,doc,docx|max:10240',
        ];
    }
}
