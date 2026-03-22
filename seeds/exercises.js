export async function seed(knex) {
  // Only insert if no default exercises exist yet
  const existing = await knex('exercises').where({ is_default: true }).first();
  if (existing) return;

  const exercises = [
    // Chest
    { name: 'Barbell Bench Press', category: 'chest', equipment: 'barbell', muscle_group: 'pectorals', instructions: 'Lie on a flat bench, grip the barbell slightly wider than shoulder-width. Lower the bar to your chest, then press up to full extension.' },
    { name: 'Incline Dumbbell Press', category: 'chest', equipment: 'dumbbell', muscle_group: 'upper pectorals', instructions: 'Set the bench to 30-45 degrees. Press dumbbells up from shoulder level to full arm extension.' },
    { name: 'Dumbbell Fly', category: 'chest', equipment: 'dumbbell', muscle_group: 'pectorals', instructions: 'Lie flat on a bench holding dumbbells above your chest. Lower them out to the sides in a wide arc, then bring them back together.' },
    { name: 'Cable Crossover', category: 'chest', equipment: 'cable', muscle_group: 'pectorals', instructions: 'Set cables at high position. Step forward and bring handles together in front of your chest in a hugging motion.' },
    { name: 'Push-up', category: 'chest', equipment: 'bodyweight', muscle_group: 'pectorals', instructions: 'Start in a plank position with hands slightly wider than shoulders. Lower your body until your chest nearly touches the floor, then push back up.' },
    { name: 'Chest Dip', category: 'chest', equipment: 'bodyweight', muscle_group: 'lower pectorals', instructions: 'Lean forward on parallel bars. Lower your body by bending elbows until you feel a stretch in your chest, then push back up.' },

    // Back
    { name: 'Barbell Deadlift', category: 'back', equipment: 'barbell', muscle_group: 'posterior chain', instructions: 'Stand with feet hip-width apart, grip the bar outside your knees. Drive through your heels, keeping your back straight, to stand up tall.' },
    { name: 'Pull-up', category: 'back', equipment: 'bodyweight', muscle_group: 'lats', instructions: 'Hang from a bar with an overhand grip. Pull yourself up until your chin is above the bar, then lower with control.' },
    { name: 'Barbell Bent-over Row', category: 'back', equipment: 'barbell', muscle_group: 'lats', instructions: 'Hinge at the hips with a slight knee bend. Pull the barbell to your lower chest, squeezing your shoulder blades together.' },
    { name: 'Lat Pulldown', category: 'back', equipment: 'cable', muscle_group: 'lats', instructions: 'Sit at the lat pulldown machine and grip the bar wide. Pull the bar down to your upper chest, then slowly return.' },
    { name: 'Seated Cable Row', category: 'back', equipment: 'cable', muscle_group: 'middle back', instructions: 'Sit upright and pull the handle to your torso, squeezing your shoulder blades. Slowly extend your arms back.' },
    { name: 'Dumbbell Single-arm Row', category: 'back', equipment: 'dumbbell', muscle_group: 'lats', instructions: 'Place one knee and hand on a bench. Row the dumbbell up to your hip, keeping your elbow close to your body.' },

    // Shoulders
    { name: 'Overhead Press', category: 'shoulders', equipment: 'barbell', muscle_group: 'deltoids', instructions: 'Stand with feet shoulder-width apart. Press the barbell overhead from shoulder level to full arm extension.' },
    { name: 'Dumbbell Shoulder Press', category: 'shoulders', equipment: 'dumbbell', muscle_group: 'deltoids', instructions: 'Sit or stand holding dumbbells at shoulder height. Press them overhead until arms are fully extended.' },
    { name: 'Lateral Raise', category: 'shoulders', equipment: 'dumbbell', muscle_group: 'lateral deltoids', instructions: 'Stand with dumbbells at your sides. Raise your arms out to the sides until they are parallel to the floor.' },
    { name: 'Front Raise', category: 'shoulders', equipment: 'dumbbell', muscle_group: 'anterior deltoids', instructions: 'Stand holding dumbbells in front of your thighs. Raise one or both arms forward to shoulder height.' },
    { name: 'Face Pull', category: 'shoulders', equipment: 'cable', muscle_group: 'rear deltoids', instructions: 'Set a cable at face height with a rope attachment. Pull the rope towards your face, separating the ends and squeezing your rear delts.' },

    // Arms
    { name: 'Barbell Bicep Curl', category: 'arms', equipment: 'barbell', muscle_group: 'biceps', instructions: 'Stand holding a barbell with an underhand grip. Curl the bar up to your shoulders, then lower with control.' },
    { name: 'Dumbbell Bicep Curl', category: 'arms', equipment: 'dumbbell', muscle_group: 'biceps', instructions: 'Stand with dumbbells at your sides, palms forward. Curl the weights up to your shoulders, then lower slowly.' },
    { name: 'Hammer Curl', category: 'arms', equipment: 'dumbbell', muscle_group: 'brachialis', instructions: 'Hold dumbbells with a neutral grip (palms facing each other). Curl up without rotating your wrists.' },
    { name: 'Tricep Pushdown', category: 'arms', equipment: 'cable', muscle_group: 'triceps', instructions: 'Stand at a cable machine with a straight or rope attachment. Push the weight down until your arms are fully extended.' },
    { name: 'Skull Crusher', category: 'arms', equipment: 'barbell', muscle_group: 'triceps', instructions: 'Lie on a bench holding an EZ-bar above your chest. Lower the bar towards your forehead by bending at the elbows, then extend back up.' },
    { name: 'Tricep Dip', category: 'arms', equipment: 'bodyweight', muscle_group: 'triceps', instructions: 'Support yourself on parallel bars with arms straight. Lower your body by bending your elbows, then push back up.' },

    // Legs
    { name: 'Barbell Back Squat', category: 'legs', equipment: 'barbell', muscle_group: 'quadriceps', instructions: 'Place the barbell on your upper back. Squat down until your thighs are parallel to the floor, then drive back up.' },
    { name: 'Front Squat', category: 'legs', equipment: 'barbell', muscle_group: 'quadriceps', instructions: 'Hold the barbell across the front of your shoulders. Squat down keeping your torso upright, then stand back up.' },
    { name: 'Leg Press', category: 'legs', equipment: 'machine', muscle_group: 'quadriceps', instructions: 'Sit in the leg press machine with feet shoulder-width apart on the platform. Lower the weight by bending your knees, then press back up.' },
    { name: 'Romanian Deadlift', category: 'legs', equipment: 'barbell', muscle_group: 'hamstrings', instructions: 'Hold a barbell at hip level. Hinge at the hips, lowering the bar along your legs while keeping a slight knee bend. Return to standing.' },
    { name: 'Leg Curl', category: 'legs', equipment: 'machine', muscle_group: 'hamstrings', instructions: 'Lie face down on the leg curl machine. Curl the weight up by bending your knees, then lower with control.' },
    { name: 'Leg Extension', category: 'legs', equipment: 'machine', muscle_group: 'quadriceps', instructions: 'Sit in the leg extension machine. Extend your legs fully, squeeze your quads at the top, then lower slowly.' },
    { name: 'Walking Lunge', category: 'legs', equipment: 'dumbbell', muscle_group: 'quadriceps', instructions: 'Hold dumbbells at your sides. Step forward into a lunge, lowering your back knee towards the floor, then step forward with the other leg.' },
    { name: 'Calf Raise', category: 'legs', equipment: 'machine', muscle_group: 'calves', instructions: 'Stand on the edge of a step or calf raise machine. Rise up on your toes as high as possible, then lower your heels below the step.' },
    { name: 'Bulgarian Split Squat', category: 'legs', equipment: 'dumbbell', muscle_group: 'quadriceps', instructions: 'Stand with one foot on a bench behind you. Lower into a lunge until your front thigh is parallel to the floor, then drive back up.' },

    // Core
    { name: 'Plank', category: 'core', equipment: 'bodyweight', muscle_group: 'abdominals', instructions: 'Hold a push-up position on your forearms. Keep your body in a straight line from head to heels. Hold for the prescribed duration.' },
    { name: 'Hanging Leg Raise', category: 'core', equipment: 'bodyweight', muscle_group: 'lower abdominals', instructions: 'Hang from a pull-up bar. Raise your legs up until they are parallel to the floor or higher, then lower with control.' },
    { name: 'Cable Woodchop', category: 'core', equipment: 'cable', muscle_group: 'obliques', instructions: 'Set a cable at high position. Pull the handle diagonally across your body from high to low, rotating your torso.' },
    { name: 'Ab Wheel Rollout', category: 'core', equipment: 'bodyweight', muscle_group: 'abdominals', instructions: 'Kneel on the floor holding an ab wheel. Roll the wheel forward, extending your body, then roll back to the starting position.' },
    { name: 'Russian Twist', category: 'core', equipment: 'bodyweight', muscle_group: 'obliques', instructions: 'Sit on the floor with knees bent and feet elevated. Rotate your torso side to side, optionally holding a weight.' },

    // Cardio
    { name: 'Treadmill Running', category: 'cardio', equipment: 'machine', muscle_group: 'cardiovascular', instructions: 'Run on the treadmill at your target pace. Adjust speed and incline based on your fitness level and goals.' },
    { name: 'Cycling', category: 'cardio', equipment: 'machine', muscle_group: 'cardiovascular', instructions: 'Pedal on a stationary bike at a steady pace or intervals. Adjust resistance to match your target intensity.' },
    { name: 'Rowing', category: 'cardio', equipment: 'machine', muscle_group: 'full body', instructions: 'Sit on the rowing machine. Drive with your legs, lean back slightly, and pull the handle to your chest. Return in reverse order.' },
    { name: 'Jump Rope', category: 'cardio', equipment: 'bodyweight', muscle_group: 'cardiovascular', instructions: 'Swing the rope over your head and jump with both feet. Maintain a steady rhythm and land softly on the balls of your feet.' },
    { name: 'Battle Ropes', category: 'cardio', equipment: 'band', muscle_group: 'full body', instructions: 'Hold one end of each rope. Create waves by alternating arms up and down rapidly. Keep your core engaged throughout.' },
    { name: 'Burpee', category: 'cardio', equipment: 'bodyweight', muscle_group: 'full body', instructions: 'From standing, squat down, kick your feet back into a plank, do a push-up, jump your feet forward, and jump up with arms overhead.' },

    // Full Body
    { name: 'Kettlebell Swing', category: 'full_body', equipment: 'kettlebell', muscle_group: 'posterior chain', instructions: 'Stand with feet wider than shoulder-width. Hinge at the hips and swing the kettlebell between your legs, then drive your hips forward to swing it to chest height.' },
    { name: 'Clean and Press', category: 'full_body', equipment: 'barbell', muscle_group: 'full body', instructions: 'Deadlift the bar to your hips, then explosively pull it to your shoulders (clean). From there, press the bar overhead.' },
    { name: 'Turkish Get-up', category: 'full_body', equipment: 'kettlebell', muscle_group: 'full body', instructions: 'Lie on your back holding a kettlebell overhead. Stand up while keeping the weight locked out above you, then reverse the movement to lie back down.' },
  ];

  await knex('exercises').insert(
    exercises.map(e => ({ ...e, is_default: true, gym_id: null }))
  );
}
