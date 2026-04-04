import random
import string
import uuid


def generate_user_sub():
    """
    Function returns generated user sub
    :return: generated user sub
    :rtype: str
    """
    return 'rmx_' + uuid.uuid4().hex


adjectives_list = (
    'energetic', 'agreeable', 'unusual', 'sensitive', 'drab', 'known', 'amusing', 'legal', 'considerate', 'traditional',
    'cultural', 'bright', 'affable', 'successful', 'sorry', 'unhappy', 'broad-minded', 'pregnant', 'logical', 'distinct',
    'electrical', 'placid', 'plain', 'loyal', 'confident', 'healthy', 'administrative', 'severe', 'alive', 'unassuming',
    'pure', 'former', 'glamorous', 'convivial', 'political', 'gregarious', 'honest', 'green', 'willing', 'every',
    'exciting', 'long', 'determined', 'scared', 'happy', 'aggressive', 'fancy', 'famous', 'lucky', 'charming',
    'nervous', 'powerful', 'warmhearted', 'rare', 'hard-working', 'quaint', 'gentle', 'existing', 'magnificent', 'additional',
    'lonely', 'diligent', 'clever', 'quick-witted', 'curious', 'humorous', 'acceptable', 'pleasant', 'practical', 'patient',
    'informal', 'environmental', 'tidy', 'ugliest', 'decisive', 'kind', 'straightforward', 'inventive', 'independent', 'popular',
    'adaptable', 'self-confident', 'entire', 'unfair', 'passionate', 'southern', 'loving', 'automatic', 'asleep', 'gray',
    'sudden', 'easy', 'consistent', 'wonderful', 'interesting', 'plucky', 'better', 'yellow', 'exuberant', 'civil',
    'quiet', 'visible', 'beautiful', 'fearless', 'impartial', 'thoughtful', 'immediate', 'hungry', 'global', 'ambitious',
    'sufficient', 'expensive', 'imaginative', 'serious', 'federal', 'typical', 'orange', 'eastern', 'intuitive', 'poor',
    'polite', 'red', 'competitive', 'resourceful', 'unlikely', 'rich', 'inner', 'guilty', 'nice', 'decent',
    'amicable', 'angry', 'communicative', 'helpful', 'courteous', 'impossible', 'sparkling', 'recent', 'intellectual', 'psychological',
    'afraid', 'pro-active', 'reasonable', 'conscientious', 'funny', 'tough', 'similar', 'emotional', 'anxious', 'tiny',
    'several', 'hot', 'sympathetic', 'educational', 'enthusiastic', 'foreign', 'reliable', 'brave', 'dramatic', 'realistic',
    'weak', 'unsightly', 'boring', 'old', 'adventurous', 'easygoing', 'faithful', 'latter', 'modest', 'responsible',
    'comprehensive', 'good', 'reserved', 'courageous', 'efficient', 'suspicious', 'wooden', 'strong', 'capable', 'gifted',
    'self-disciplined', 'compassionate', 'difficult', 'sociable', 'sexual', 'mental', 'amiable', 'intelligent', 'blue', 'handsome',
    'discreet', 'sensible', 'black', 'philosophical', 'friendly', 'fair-minded', 'neat', 'actual', 'able', 'large',
    'basic', 'desperate', 'available', 'sincere', 'important', 'impressive', 'odd', 'affectionate', 'diplomatic', 'versatile',
    'critical', 'ugly', 'pioneering', 'huge', 'different', 'dangerous', 'creative', 'strict', 'suitable', 'historical',
    'clean', 'electronic', 'relevant', 'witty', 'aware', 'numerous', 'rational', 'terrible', 'unable', 'conscious',
    'dead', 'shy', 'white', 'purple', 'forceful', 'understanding', 'various', 'significant', 'obvious', 'calm',
    'useful', 'accurate', 'remarkable', 'substantial', 'dynamic', 'frank', 'financial', 'cute', 'careful', 'optimistic',
    'mad', 'tall', 'persistent', 'elegant', 'technical', 'united', 'massive', 'romantic', 'generous', 'embarrassed',
    'medical',
)

nouns_list = (
    'advice', 'improvement', 'attitude', 'control', 'program', 'teacher', 'county', 'imagination', 'personality', 'trainer',
    'currency', 'outcome', 'elevator', 'contribution', 'leadership', 'mud', 'pollution', 'confusion', 'singer', 'dad',
    'flight', 'king', 'wedding', 'change', 'grocery', 'product', 'tea', 'safety', 'cabinet', 'movie',
    'manufacturer', 'house', 'negotiation', 'technology', 'environment', 'literature', 'communication', 'map', 'magazine', 'platform',
    'role', 'student', 'day', 'head', 'office', 'concept', 'dirt', 'ambition', 'diamond', 'customer',
    'work', 'enthusiasm', 'growth', 'reception', 'speaker', 'presentation', 'delivery', 'oven', 'part', 'throat',
    'interaction', 'republic', 'arrival', 'professor', 'inspection', 'side', 'thought', 'member', 'word', 'depth',
    'extent', 'device', 'possession', 'meal', 'pizza', 'drama', 'child', 'reflection', 'salad', 'book',
    'assumption', 'development', 'chocolate', 'science', 'queen', 'phone', 'resource', 'recording', 'examination', 'guy',
    'variation', 'year', 'guest', 'person', 'love', 'eye', 'comparison', 'emotion', 'police', 'employment',
    'recipe', 'fishing', 'apple', 'university', 'media', 'shirt', 'sir', 'reading', 'disk', 'clothes',
    'feedback', 'history', 'gate', 'name', 'cancer', 'president', 'difficulty', 'database', 'activity', 'bonus',
    'army', 'disease', 'sympathy', 'hearing', 'revolution', 'manager', 'physics', 'policy', 'security', 'honey',
    'percentage', 'girl', 'estate', 'hall', 'affair', 'tongue', 'country', 'possibility', 'minute', 'ear',
    'intention', 'conversation', 'restaurant', 'area', 'basket', 'power', 'thing', 'village', 'information', 'state',
    'direction', 'classroom', 'association', 'dinner', 'face', 'awareness', 'birthday', 'wood', 'region', 'payment',
    'permission', 'issue', 'replacement', 'painting', 'combination', 'context', 'effort', 'door', 'nature', 'election',
    'bird', 'party', 'soup', 'ratio', 'preparation', 'knowledge', 'pie', 'bath', 'week', 'engine',
    'memory', 'user', 'setting', 'line', 'location', 'decision', 'foundation', 'funeral', 'selection', 'right',
    'employee', 'fact', 'relationship', 'people', 'weakness', 'population', 'hat', 'kind', 'refrigerator', 'consequence',
    'scene', 'actor', 'girlfriend', 'story', 'moment', 'analysis', 'courage', 'goal', 'emphasis', 'sector',
    'time', 'software', 'aspect', 'discussion', 'lake', 'addition', 'quantity', 'number', 'mall', 'community',
    'video', 'marketing', 'message', 'city', 'month', 'statement', 'piano', 'perception', 'housing', 'cousin',
    'indication', 'boyfriend', 'poetry', 'disaster', 'medicine', 'health', 'art', 'inflation', 'description', 'fortune',
    'income', 'session', 'world', 'judgment', 'lady', 'research', 'result', 'secretary', 'grandmother', 'assistant',
    'appearance', 'bread', 'revenue', 'cell', 'wealth', 'alcohol', 'desk', 'father', 'dealer', 'cigarette',
    'opportunity', 'membership', 'hour', 'introduction', 'drawing', 'climate', 'equipment', 'library', 'driver', 'skill',
    'sample', 'job', 'distribution', 'entertainment', 'argument', 'unit', 'passenger', 'length', 'sister', 'hair',
    'obligation', 'bedroom', 'farmer', 'church', 'company', 'measurement', 'blood', 'speech', 'response', 'poem',
    'importance', 'height', 'place', 'football', 'promotion', 'group', 'heart', 'coffee', 'department', 'resolution',
    'problem', 'virus', 'air', 'player', 'criticism', 'celebration', 'championship', 'establishment', 'administration', 'parent',
    'volume', 'business', 'patience', 'injury', 'historian', 'insect', 'loss', 'school', 'woman', 'union',
    'category', 'competition', 'complaint', 'suggestion', 'stranger', 'service', 'buyer', 'home', 'orange', 'uncle',
    'mixture', 'opinion', 'protection', 'contract', 'society', 'baseball', 'son', 'team', 'understanding', 'expression',
    'reason', 'basis', 'tennis', 'gene', 'guitar', 'marriage', 'advertising', 'war', 'system', 'room',
    'math', 'garbage', 'version', 'road', 'engineering', 'hotel', 'potato', 'freedom', 'leader', 'government',
    'newspaper', 'topic', 'guidance', 'employer', 'connection', 'idea', 'lab', 'management', 'procedure', 'organization',
    'philosophy', 'excitement', 'accident', 'thanks', 'highway', 'presence', 'mother', 'variety', 'charity', 'insurance',
    'supermarket', 'article', 'law', 'psychology', 'editor', 'lot', 'method', 'instance', 'inspector', 'friendship',
    'strategy', 'study', 'internet', 'level', 'failure', 'education', 'truth', 'impression', 'car', 'hospital',
    'property', 'efficiency', 'menu', 'music', 'game', 'midnight', 'shopping', 'solution', 'college', 'theory',
    'proposal', 'ad', 'camera', 'agency', 'worker', 'conclusion', 'song', 'audience', 'energy', 'atmosphere',
    'responsibility', 'body', 'passion', 'economics', 'finding', 'investment', 'food', 'winner', 'cheek', 'perspective',
    'town', 'director', 'teaching', 'language', 'life', 'requirement', 'water', 'beer', 'cookie', 'tradition',
    'situation', 'homework', 'recognition', 'meat', 'reputation', 'youth', 'tale', 'family', 'signature', 'warning',
    'writing', 'meaning', 'recommendation', 'television', 'wife', 'news', 'error', 'collection', 'exam', 'studio',
    'surgery', 'client', 'writer', 'chemistry', 'childhood', 'ability', 'steak', 'kid', 'significance', 'transportation',
    'breath', 'industry', 'way', 'friend', 'mood', 'back', 'death', 'anxiety', 'nation', 'event',
    'performance', 'entry', 'priority', 'candidate', 'mode', 'agreement', 'independence', 'attention', 'debt', 'explanation',
    'chest', 'apartment', 'instruction', 'departure', 'others', 'success', 'hand', 'initiative', 'tension', 'two',
    'quality', 'ladder', 'chapter', 'money', 'difference', 'definition', 'operation', 'mom', 'night', 'temperature',
    'drawer', 'assignment', 'storage', 'construction', 'application', 'river', 'point', 'bathroom', 'appointment', 'politics',
    'penalty', 'computer', 'analyst', 'poet', 'vehicle', 'data', 'relation', 'tooth', 'committee', 'reality',
    'maintenance', 'photo', 'depression', 'preference', 'owner', 'profession', 'reaction', 'case', 'assistance', 'morning',
    'satisfaction', 'paper', 'series', 'airport',
)


def get_random_display_name():
    """
    Function returns random DisplayName as concatenation of adjective and noun with random number
    :return: Randomized DisplayName
    :rtype: str
    """
    adjective = random.choice(adjectives_list).title()
    noun = random.choice(nouns_list).title()

    suffix = ''.join([random.choice(string.ascii_letters + string.digits) for _ in range(10)])

    return '{}_{}@{}'.format(adjective, noun, suffix)
