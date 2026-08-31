window.Cloud = {
  client: null,
  ready: false,
  user: null,

  async init() {
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return false;
    this.client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    const { data } = await this.client.auth.getSession();
    this.user = data.session && data.session.user ? data.session.user : null;
    this.ready = true;
    return true;
  },

  async signIn(email, password) {
    const { data, error } = await this.client.auth.signInWithPassword({ email: email, password: password });
    if (error) throw error;
    this.user = data.user;
    return data.user;
  },

  async signOut() {
    await this.client.auth.signOut();
    this.user = null;
  },

  rowToSample: function (row) {
    return {
      id: row.id,
      name: row.name,
      brand: row.brand || "",
      origin: row.origin || "",
      volume: row.volume || "",
      price: row.price || "",
      boughtAt: row.bought_at || "",
      tastedOn: row.tasted_on || "",
      temp: row.temp || "",
      image: row.image || "",
      colorId: row.color_id || "",
      colorNote: row.color_note || "",
      scores: row.scores || {},
      notes: row.notes || {},
      composition: row.composition || {},
      style: row.style || "",
      pros: row.pros || "",
      cons: row.cons || "",
      grade: row.grade || "",
      repurchase: row.repurchase || "",
      verdict: row.verdict || "",
      memo: row.memo || "",
      alien: row.alien || ""
    };
  },

  sampleToRow: function (s) {
    return {
      id: s.id,
      name: s.name,
      brand: s.brand,
      origin: s.origin,
      volume: s.volume,
      price: s.price,
      bought_at: s.boughtAt,
      tasted_on: s.tastedOn || null,
      temp: s.temp,
      image: s.image,
      color_id: s.colorId,
      color_note: s.colorNote,
      scores: s.scores,
      notes: s.notes,
      composition: s.composition,
      style: s.style,
      pros: s.pros,
      cons: s.cons,
      grade: s.grade,
      repurchase: s.repurchase,
      verdict: s.verdict,
      memo: s.memo,
      alien: s.alien,
      updated_at: new Date().toISOString()
    };
  },

  async fetchSamples() {
    const { data, error } = await this.client.from("samples").select("*").order("id");
    if (error) throw error;
    const self = this;
    return (data || []).map(function (row) { return self.rowToSample(row); });
  },

  async upsertSample(sample) {
    const { error } = await this.client.from("samples").upsert(this.sampleToRow(sample));
    if (error) throw error;
  },

  async deleteSample(id) {
    const { error } = await this.client.from("samples").delete().eq("id", id);
    if (error) throw error;
  },

  async uploadPhoto(id, file) {
    const parts = file.name.split(".");
    const ext = (parts[parts.length - 1] || "jpg").toLowerCase();
    const path = id + "-" + Date.now() + "." + ext;
    const { error } = await this.client.storage.from("sample-photos").upload(path, file, { upsert: true });
    if (error) throw error;
    const pub = this.client.storage.from("sample-photos").getPublicUrl(path);
    return pub.data.publicUrl;
  }
};
