export interface Segment {
    segment_id: number; // Identifiant unique du segment
    start_time: string; // Heure de début du segment
    end_time: string; // Heure de fin du segment
    status: string; // Statut du segment (ex. : 'available', 'in_progress', etc.)
    user_id: number; // Identifiant de l'utilisateur assigné au segment
    subtitles: { text: string }[]; // Liste des sous-titres associés au segment
    user_name?: string; 
  }
  