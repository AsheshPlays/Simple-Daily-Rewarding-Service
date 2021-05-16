export default {
    getMonday: function(d: Date) {
        d = new Date(d)
        const day = d.getDay()
        const diff = d.getDate() - day + (day == 0 ? -6 : 1) // adjust when day is sunday
        d = new Date(d.setDate(diff))
        return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    }
}