<?php

namespace App\Http\Controllers\Modules\Forms\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Modules\Forms\Models\Form;
use App\Modules\Candidates\Models\Candidate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PublicFormController extends Controller
{
    public function __construct(protected \App\Modules\Candidates\Services\DiditService $diditService)
    {
    }

    /**
     * Get form by UUID for public access
     */
    public function show(string $uuid)
    {
        $form = Form::with('fields')
            ->where('uuid', $uuid)
            ->where('status', 'active')
            ->firstOrFail();

        return response()->json($form);
    }

    /**
     * Submit a public form
     */
    public function submit(Request $request, string $uuid)
    {
        $form = Form::with('fields')
            ->where('uuid', $uuid)
            ->where('status', 'active')
            ->firstOrFail();

        // Build dynamic validation rules based on form fields
        $rules = [
            'fields.name' => 'required|string|max:255',
            'fields.email' => 'required|email|max:255',
        ];
        
        foreach ($form->fields as $field) {
            if (in_array($field->name, ['name', 'email'])) continue;
            
            $fieldRules = [];
            
            if ($field->validation_rules) {
                if (isset($field->validation_rules['required']) && $field->validation_rules['required']) {
                    $fieldRules[] = 'required';
                }
                if (isset($field->validation_rules['max'])) {
                    $fieldRules[] = 'max:' . $field->validation_rules['max'];
                }
                if (isset($field->validation_rules['min'])) {
                    $fieldRules[] = 'min:' . $field->validation_rules['min'];
                }
            }

            // Add type-specific validation
            if ($field->type === 'email') {
                $fieldRules[] = 'email';
            } elseif ($field->type === 'number') {
                $fieldRules[] = 'numeric';
            } elseif ($field->type === 'file') {
                $fieldRules[] = 'file';
            }

            $rules['fields.' . $field->name] = $fieldRules;
        }

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $fields = $request->input('fields', []);

        $candidateData = [
            'form_id' => $form->id,
            'name' => $fields['name'] ?? $fields['full_name'] ?? 'Unknown',
            'email' => $fields['email'],
            'phone' => $fields['phone'] ?? null,
            'position' => $fields['position'] ?? null,
            'gender' => $fields['gender'] ?? null,
            'nationality' => $fields['nationality'] ?? null,
            'dob' => $fields['dob'] ?? null,
            'address' => $fields['address'] ?? null,
            'social_security_number' => $fields['social_security_number'] ?? $fields['ssn'] ?? null,
            'emergency_phone' => $fields['emergency_phone'] ?? null,
            'recruitment_city' => $fields['recruitment_city'] ?? null,
            'animator_name' => $fields['animator_name'] ?? null,
            'product_justcost' => $fields['product_justcost'] ?? null,
            'contract_type' => $fields['contract_type'] ?? null,
            'start_date' => $fields['start_date'] ?? null,
            'contract_status' => 'pending',
            'data' => $fields, // Store all form data as JSON
        ];

        // If KYC is enabled, return redirect URL
        if ($form->kyc_enabled) {
            try {
                $session = $this->diditService->createSession(array_merge($candidateData, [
                    'dob' => $fields['dob'] ?? null,
                ]));

                return response()->json([
                    'message' => 'Identity verification required',
                    'kyc_required' => true,
                    'kyc_redirect_url' => $session['url'],
                ], 201);
            } catch (\Exception $e) {
                return response()->json([
                    'message' => 'Failed to initiate KYC.',
                    'error' => $e->getMessage()
                ], 500);
            }
        }

        // Create candidate immediately if KYC is disabled
        $candidate = Candidate::create($candidateData);

        return response()->json([
            'message' => 'Form submitted successfully',
            'candidate_id' => $candidate->id,
        ], 201);
    }
}
