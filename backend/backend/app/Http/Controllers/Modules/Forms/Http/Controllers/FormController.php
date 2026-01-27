<?php

namespace App\Http\Controllers\Modules\Forms\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Modules\Forms\Models\Form;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FormController extends Controller
{
    /**
     * Display a listing of forms.
     */
    public function index()
    {
        $forms = Form::with(['fields', 'creator'])
            ->where('created_by', Auth::id())
            ->orWhereHas('creator', function ($query) {
                $query->whereHas('roles', function ($q) {
                    $q->where('name', 'admin');
                });
            })
            ->latest()
            ->get();

        return response()->json($forms);
    }

    /**
     * Store a newly created form.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'in:draft,active,disabled',
            'kyc_enabled' => 'boolean',
            'fields' => 'required|array',
            'fields.*.type' => 'required|string',
            'fields.*.label' => 'required|string',
            'fields.*.name' => 'required|string',
            'fields.*.validation_rules' => 'nullable|array',
            'fields.*.order' => 'integer',
        ]);

        $form = Form::create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? 'draft',
            'kyc_enabled' => $validated['kyc_enabled'] ?? false,
            'created_by' => Auth::id(),
        ]);

        foreach ($validated['fields'] as $index => $fieldData) {
            $form->fields()->create([
                'type' => $fieldData['type'],
                'label' => $fieldData['label'],
                'name' => $fieldData['name'],
                'validation_rules' => $fieldData['validation_rules'] ?? null,
                'order' => $fieldData['order'] ?? $index,
            ]);
        }

        return response()->json($form->load('fields'), 201);
    }

    /**
     * Display the specified form.
     */
    public function show(string $id)
    {
        $form = Form::with('fields')->findOrFail($id);
        return response()->json($form);
    }

    /**
     * Update the specified form.
     */
    public function update(Request $request, string $id)
    {
        $form = Form::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'in:draft,active,disabled',
            'kyc_enabled' => 'boolean',
            'fields' => 'sometimes|array',
            'fields.*.id' => 'nullable|exists:form_fields,id',
            'fields.*.type' => 'required|string',
            'fields.*.label' => 'required|string',
            'fields.*.name' => 'required|string',
            'fields.*.validation_rules' => 'nullable|array',
            'fields.*.order' => 'integer',
        ]);

        $form->update($validated);

        if (isset($validated['fields'])) {
            // Delete fields not in the update
            $fieldIds = collect($validated['fields'])->pluck('id')->filter();
            $form->fields()->whereNotIn('id', $fieldIds)->delete();

            foreach ($validated['fields'] as $index => $fieldData) {
                if (isset($fieldData['id'])) {
                    $form->fields()->where('id', $fieldData['id'])->update([
                        'type' => $fieldData['type'],
                        'label' => $fieldData['label'],
                        'name' => $fieldData['name'],
                        'validation_rules' => $fieldData['validation_rules'] ?? null,
                        'order' => $fieldData['order'] ?? $index,
                    ]);
                } else {
                    $form->fields()->create([
                        'type' => $fieldData['type'],
                        'label' => $fieldData['label'],
                        'name' => $fieldData['name'],
                        'validation_rules' => $fieldData['validation_rules'] ?? null,
                        'order' => $fieldData['order'] ?? $index,
                    ]);
                }
            }
        }

        return response()->json($form->fresh('fields'));
    }

    /**
     * Remove the specified form.
     */
    public function destroy(string $id)
    {
        $form = Form::findOrFail($id);
        $form->delete();

        return response()->json(['message' => 'Form deleted successfully']);
    }
}
