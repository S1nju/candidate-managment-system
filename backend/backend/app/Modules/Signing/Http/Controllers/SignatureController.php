<?php

namespace App\Modules\Signing\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use App\Modules\Signing\Models\Signature;
use Illuminate\Validation\Rule;
use Carbon\Carbon;

class SignatureController extends Controller
{
    public function index(): JsonResponse
    {
        $user = Auth::user();
        $signatures = Signature::where('user_id', $user->id)->orderByDesc('created_at')->get();
        return response()->json(['data' => $signatures]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();
        $data = $request->validate([
            'type' => ['required', Rule::in(['drawn', 'typed', 'uploaded'])],
            'value' => 'required|string',
            'initials' => 'nullable|string',
            'date' => 'nullable|date',
        ]);
        $signature = Signature::create([
            'user_id' => $user->id,
            'type' => $data['type'],
            'value' => $data['value'],
            'initials' => $data['initials'] ?? null,
            'date' => $data['date'] ?? Carbon::now()->toDateString(),
        ]);
        return response()->json($signature, 201);
    }

    public function upload(Request $request): JsonResponse
    {
        $user = Auth::user();
        $request->validate([
            'file' => 'required|image|max:2048',
        ]);
        $path = $request->file('file')->store('signatures', 'public');
        $signature = Signature::create([
            'user_id' => $user->id,
            'type' => 'uploaded',
            'value' => Storage::disk('public')->url($path),
            'date' => Carbon::now()->toDateString(),
        ]);
        return response()->json($signature, 201);
    }

    public function destroy($id): JsonResponse
    {
        $user = Auth::user();
        $signature = Signature::where('user_id', $user->id)->where('id', $id)->firstOrFail();
        $signature->delete();
        return response()->json(['message' => 'Signature deleted']);
    }
}
