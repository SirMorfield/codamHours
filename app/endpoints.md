GET /user/$NAME
```json5
{
	"lastUpdate":
	{
		"formatted": "Mon 12 Aug 15:42", // Date and time
		"timestamp": 1969696969
	},
	"weeks":
	[
		{
			"weekNumber": 42, // :int year week
			"start": "Mon 12 Aug",
			"end": "Sun 19 Aug",
			"hours": 5.2 // :float
		}
	]
}
```

Mvp requirements
- List total number of hours from every week
- Last update date
- Hark theme

Future
- If you are considered to be in the building
- Hours to go this week
- Heatmap of days present in the building like on intra
